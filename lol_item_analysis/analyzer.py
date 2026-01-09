import pandas as pd
import numpy as np

class MatchAnalyzer:
    def __init__(self, riot_client):
        self.client = riot_client
        self.items_data = self.client.items_data

    def is_completed_item(self, item_id):
        item_str = str(item_id)
        if item_str not in self.items_data:
            return False
        
        item_info = self.items_data[item_str]
        tags = item_info.get('tags', [])
        gold = item_info.get('gold', {})
        total_cost = gold.get('total', 0)
        
        # Filter out boots, consumables, trinkets
        if 'Boots' in tags:
            return False
        if 'Consumable' in tags:
            return False
        if 'Trinket' in tags:
            return False
        
        # Heuristic for completed items (Legendary/Mythic)
        # Most completed items cost > 2000
        # Or have depth 3 (sometimes depth isn't consistent)
        # Checking if it builds into anything else is also a clue (if 'into' is empty or only Ornn upgrades)
        
        into = item_info.get('into', [])
        
        # Some components are expensive (BF Sword 1300), but completed items usually > 2000.
        # Support items are exceptions (cheap final forms).
        # Let's use a cost threshold of 2000 OR (is final item AND cost > 1000)
        
        is_final = len(into) == 0
        
        if total_cost > 2000:
            return True
        if is_final and total_cost > 1000:
            return True
            
        return False

    def get_item_name(self, item_id):
        if str(item_id) in self.items_data:
            return self.items_data[str(item_id)]['name']
        return f"Unknown Item ({item_id})"

    def analyze_match(self, match_id, target_puuid):
        timeline = self.client.get_match_timeline(match_id)
        if not timeline:
            return None

        # 1. Find participantId for the PUUID
        # In Match V5 timeline, participants are in `info.participants` metadata usually, 
        # or we have to look at the `metadata` section.
        # Timeline response structure:
        # { "metadata": { "participants": ["puuid1", ...] }, "info": { "frames": [...] } }
        
        metadata = timeline.get('metadata', {})
        participants = metadata.get('participants', [])
        
        try:
            p_index = participants.index(target_puuid)
            participant_id = p_index + 1 # participantId is 1-10
        except ValueError:
            print(f"PUUID not found in match {match_id}")
            return None

        # 2. Scan events
        purchases = [] # List of {'itemId': x, 'timestamp': y}
        
        info = timeline.get('info', {})
        frames = info.get('frames', [])
        
        for frame in frames:
            events = frame.get('events', [])
            for event in events:
                if event.get('participantId') != participant_id:
                    continue
                
                event_type = event.get('type')
                
                if event_type == 'ITEM_PURCHASED':
                    item_id = event.get('itemId')
                    timestamp = event.get('timestamp')
                    purchases.append({
                        'itemId': item_id,
                        'timestamp': timestamp,
                        'name': self.get_item_name(item_id)
                    })
                    
                elif event_type == 'ITEM_UNDO':
                    # Remove the corresponding purchase if it exists
                    # Undo event usually contains `afterId` or `beforeId`. 
                    # If we just bought item X, and undo, we remove the last instance of X.
                    # Or simpler: just remove the last purchase event if it matches the undone item.
                    # Warning: Undo might not be strictly sequential if multiple things happened?
                    # But usually it is.
                    undone_item_id = event.get('itemId') or event.get('beforeId')
                    
                    # Find last purchase of this item and remove it
                    for i in range(len(purchases) - 1, -1, -1):
                        if purchases[i]['itemId'] == undone_item_id:
                            purchases.pop(i)
                            break
                            
        # 3. Filter for Completed Items and get first 3
        completed_purchases = []
        seen_items = set() # Avoid duplicates if they buy same item twice? (Rare for legendaries unless sold)
        
        for p in purchases:
            if self.is_completed_item(p['itemId']):
                # Some people might sell and rebuy? Let's just track the first time they get a unique completed item.
                if p['itemId'] not in seen_items:
                    completed_purchases.append(p)
                    seen_items.add(p['itemId'])
        
        # Return first 3
        result = {
            'match_id': match_id,
            'item_1_time': None,
            'item_1_name': None,
            'item_2_time': None,
            'item_2_name': None,
            'item_3_time': None,
            'item_3_name': None
        }
        
        if len(completed_purchases) >= 1:
            result['item_1_time'] = completed_purchases[0]['timestamp'] / 60000.0 # Convert to minutes
            result['item_1_name'] = completed_purchases[0]['name']
            
        if len(completed_purchases) >= 2:
            result['item_2_time'] = completed_purchases[1]['timestamp'] / 60000.0
            result['item_2_name'] = completed_purchases[1]['name']
            
        if len(completed_purchases) >= 3:
            result['item_3_time'] = completed_purchases[2]['timestamp'] / 60000.0
            result['item_3_name'] = completed_purchases[2]['name']
            
        return result

    def analyze_matches(self, match_ids, puuid):
        results = []
        for mid in match_ids:
            print(f"Analyzing match {mid}...")
            data = self.analyze_match(mid, puuid)
            if data:
                results.append(data)
        return pd.DataFrame(results)
