import os
import argparse
from dotenv import load_dotenv
from riot_client import RiotClient
from analyzer import MatchAnalyzer

def main():
    load_dotenv()
    
    api_key = os.getenv("RIOT_API_KEY")
    if not api_key:
        print("Error: RIOT_API_KEY environment variable not found.")
        print("Please create a .env file with your Riot API key.")
        return

    parser = argparse.ArgumentParser(description="Analyze League of Legends item purchase times.")
    parser.add_argument("--name", help="Riot ID Game Name (e.g. 'Agurin')", required=True)
    parser.add_argument("--tag", help="Riot ID Tag Line (e.g. 'EUW')", required=True)
    parser.add_argument("--region", help="Region (americas, europe, asia)", default="americas")
    parser.add_argument("--count", help="Number of matches to analyze", type=int, default=20)
    
    args = parser.parse_args()
    
    # Initialize Client
    client = RiotClient(api_key, region=args.region)
    
    try:
        print(f"Fetching account for {args.name}#{args.tag}...")
        account = client.get_account_by_riot_id(args.name, args.tag)
        puuid = account['puuid']
        print(f"Found PUUID: {puuid}")
        
        print(f"Fetching recent {args.count} matches...")
        match_ids = client.get_match_ids(puuid, count=args.count)
        print(f"Found {len(match_ids)} matches.")
        
        analyzer = MatchAnalyzer(client)
        df = analyzer.analyze_matches(match_ids, puuid)
        
        if df.empty:
            print("No data found or processed.")
            return
            
        print("\n--- Analysis Results ---")
        print(f"Matches Analyzed: {len(df)}")
        
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

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
