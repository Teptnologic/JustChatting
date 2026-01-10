import os
import pandas as pd
import time
from dotenv import load_dotenv
from riot_client import RiotClient
from analyzer import MatchAnalyzer

def get_role_timings(analyzer, match_id):
    timeline = analyzer.client.get_match_timeline(match_id)
    details = analyzer.client.get_match_details(match_id)
    
    if not timeline or not details:
        return []

    # Map participantId to Role
    # details['info']['participants'] contains teamPosition
    
    participants = details.get('info', {}).get('participants', [])
    role_map = {} # participantId -> role
    
    for p in participants:
        p_id = p['participantId']
        role = p.get('teamPosition', '')
        if role in ['TOP', 'JUNGLE']:
            role_map[p_id] = role
            
    if not role_map:
        return []

    # Process Timeline
    # We need to extract purchases for each relevant participant
    
    participant_purchases = {pid: [] for pid in role_map.keys()}
    
    info = timeline.get('info', {})
    frames = info.get('frames', [])
    
    for frame in frames:
        events = frame.get('events', [])
        for event in events:
            p_id = event.get('participantId')
            if p_id not in role_map:
                continue
            
            event_type = event.get('type')
            
            if event_type == 'ITEM_PURCHASED':
                participant_purchases[p_id].append({
                    'itemId': event.get('itemId'),
                    'timestamp': event.get('timestamp')
                })
            elif event_type == 'ITEM_UNDO':
                undone_item_id = event.get('itemId') or event.get('beforeId')
                # Remove last purchase
                purchases = participant_purchases[p_id]
                for i in range(len(purchases) - 1, -1, -1):
                    if purchases[i]['itemId'] == undone_item_id:
                        purchases.pop(i)
                        break

    results = []
    
    for p_id, role in role_map.items():
        purchases = participant_purchases[p_id]
        completed_purchases = []
        seen_items = set()
        
        for p in purchases:
            if analyzer.is_completed_item(p['itemId']):
                if p['itemId'] not in seen_items:
                    completed_purchases.append(p)
                    seen_items.add(p['itemId'])
        
        # Collect timings
        row = {'role': role, 'match_id': match_id}
        for i in range(3):
            if len(completed_purchases) > i:
                row[f'item_{i+1}_time'] = completed_purchases[i]['timestamp'] / 60000.0
            else:
                row[f'item_{i+1}_time'] = None
        results.append(row)
        
    return results

def main():
    load_dotenv()
    api_key = os.getenv("RIOT_API_KEY")
    client = RiotClient(api_key, region="americas")
    analyzer = MatchAnalyzer(client)
    
    # Use Tept as a seed to get high-ish elo matches
    seed_name = "Tept"
    seed_tag = "GIVE"
    
    print(f"Fetching matches using seed: {seed_name}#{seed_tag}...")
    try:
        acc = client.get_account_by_riot_id(seed_name, seed_tag)
        puuid = acc['puuid']
        # Fetch 20 matches. This gives us 20 Top laners and 20 Junglers to average.
        match_ids = client.get_match_ids(puuid, count=20, queue=420) # Ranked only
        
        all_data = []
        for mid in match_ids:
            print(f"Analyzing match {mid}...")
            data = get_role_timings(analyzer, mid)
            all_data.extend(data)
            time.sleep(0.5) # Respect rate limits
            
        df = pd.DataFrame(all_data)
        
        print("\n--- General Role Benchmarks (Sample Size: ~20 matches) ---")
        
        for role in ['TOP', 'JUNGLE']:
            role_df = df[df['role'] == role]
            print(f"\nRole: {role} (n={len(role_df)})")
            
            for i in range(1, 4):
                col = f'item_{i}_time'
                times = role_df[col].dropna()
                if times.empty:
                    print(f"  Item {i}: No data")
                else:
                    print(f"  Item {i} Mean Time: {times.mean():.2f} min (StdDev: {times.std():.2f})")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
