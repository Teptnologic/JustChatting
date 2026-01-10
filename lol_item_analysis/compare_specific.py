import os
import pandas as pd
import time
from dotenv import load_dotenv
from riot_client import RiotClient
from analyzer import MatchAnalyzer

def get_filtered_matches(client, puuid, queue_id, criteria_func, target_count=30, max_search=100):
    """
    Fetches matches and filters them based on criteria_func(match_details, puuid).
    Returns a list of (match_id, match_details) tuples.
    """
    collected_matches = []
    start_index = 0
    batch_size = 20  # Fetch in smaller batches to avoid wasting too many calls if we find them quickly? 
                     # Actually match v5 IDs is cheap. Details are expensive.
                     # Let's fetch 100 IDs.
    
    # Fetch initial batch of IDs
    try:
        all_match_ids = client.get_match_ids(puuid, count=max_search, queue=queue_id)
    except Exception as e:
        print(f"Error fetching match IDs: {e}")
        return []

    print(f"Scanning up to {len(all_match_ids)} matches to find {target_count} matching criteria...")

    for match_id in all_match_ids:
        if len(collected_matches) >= target_count:
            break
            
        details = client.get_match_details(match_id)
        if not details:
            continue
            
        if criteria_func(details, puuid):
            collected_matches.append(match_id)
            print(f"  [Found {len(collected_matches)}/{target_count}] Match {match_id} matches criteria.")
        else:
            # print(f"  Match {match_id} skipped.")
            pass
            
        # Basic rate limit prevention (naive)
        time.sleep(0.2) 

    return collected_matches

def check_camille(details, puuid):
    info = details.get('info', {})
    participants = info.get('participants', [])
    for p in participants:
        if p.get('puuid') == puuid:
            return p.get('championName') == 'Camille'
    return False

def check_jungle(details, puuid):
    info = details.get('info', {})
    participants = info.get('participants', [])
    for p in participants:
        if p.get('puuid') == puuid:
            # Check teamPosition (usually 'JUNGLE')
            # individualPosition is also available.
            return p.get('teamPosition') == 'JUNGLE'
    return False

def print_stats(name, df):
    print(f"\n--- Analysis for {name} ---")
    if df.empty:
        print("No matches found matching criteria.")
        return

    print(f"Matches Found: {len(df)}")
    
    for i in range(1, 4):
        col = f'item_{i}_time'
        name_col = f'item_{i}_name'
        
        if col not in df.columns:
            continue
            
        times = df[col].dropna()
        if times.empty:
            print(f"\nItem {i}: No data")
            continue
            
        print(f"\nItem {i} Purchase Time (minutes):")
        print(f"  Mean:   {times.mean():.2f}")
        print(f"  Median: {times.median():.2f}")
        print(f"  StdDev: {times.std():.2f}")
        print(f"  Min:    {times.min():.2f}")
        print(f"  Max:    {times.max():.2f}")
        
        print(f"  Most Common Items:")
        top_items = df[name_col].value_counts().head(3)
        for item, count in top_items.items():
            print(f"    - {item}: {count}")

def main():
    load_dotenv()
    api_key = os.getenv("RIOT_API_KEY")
    client = RiotClient(api_key, region="americas")
    analyzer = MatchAnalyzer(client)

    # 1. Analyze 5432#66227 (Camille, Ranked)
    print("\nProcessing 5432#66227...")
    try:
        acc = client.get_account_by_riot_id("5432", "66227")
        puuid_1 = acc['puuid']
        matches_1 = get_filtered_matches(
            client, 
            puuid_1, 
            queue_id=420, 
            criteria_func=check_camille, 
            target_count=30,
            max_search=100
        )
        df_1 = analyzer.analyze_matches(matches_1, puuid_1)
        print_stats("5432#66227 (Camille)", df_1)
    except Exception as e:
        print(f"Error processing 5432: {e}")

    # 2. Analyze Tept#GIVE (Jungle, Ranked)
    print("\nProcessing Tept#GIVE...")
    try:
        acc = client.get_account_by_riot_id("Tept", "GIVE")
        puuid_2 = acc['puuid']
        matches_2 = get_filtered_matches(
            client, 
            puuid_2, 
            queue_id=420, 
            criteria_func=check_jungle, 
            target_count=30,
            max_search=100
        )
        df_2 = analyzer.analyze_matches(matches_2, puuid_2)
        print_stats("Tept#GIVE (Jungle)", df_2)
    except Exception as e:
        print(f"Error processing Tept: {e}")

if __name__ == "__main__":
    main()
