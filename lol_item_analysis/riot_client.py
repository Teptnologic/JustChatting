import requests
import time
import os

class RiotClient:
    def __init__(self, api_key, region="americas", platform="na1"):
        self.api_key = api_key
        self.region = region # For Account-V1 and Match-V5 (americas, europe, asia)
        self.platform = platform # For Summoner-V4 (na1, euw1, etc)
        self.headers = {
            "X-Riot-Token": self.api_key
        }
        self.session = requests.Session()
        self.ddragon_version = self._get_latest_ddragon_version()
        self.items_data = self._fetch_items_data()

    def _get_latest_ddragon_version(self):
        try:
            resp = self.session.get("https://ddragon.leagueoflegends.com/api/versions.json")
            if resp.status_code == 200:
                return resp.json()[0]
        except Exception as e:
            print(f"Warning: Could not fetch ddragon version: {e}")
        return "14.1.1" # Fallback

    def _fetch_items_data(self):
        url = f"https://ddragon.leagueoflegends.com/cdn/{self.ddragon_version}/data/en_US/item.json"
        try:
            resp = self.session.get(url)
            if resp.status_code == 200:
                return resp.json()['data']
        except Exception as e:
            print(f"Warning: Could not fetch item data: {e}")
        return {}

    def get_account_by_riot_id(self, game_name, tag_line):
        url = f"https://{self.region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        resp = self.session.get(url, headers=self.headers)
        if resp.status_code != 200:
            raise Exception(f"Error fetching account: {resp.status_code} {resp.text}")
        return resp.json()

    def get_match_ids(self, puuid, count=20, queue=None):
        # queue=420 is Ranked Solo/Duo
        url = f"https://{self.region}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
        params = {"start": 0, "count": count}
        if queue:
            params["queue"] = queue
        
        resp = self.session.get(url, headers=self.headers, params=params)
        if resp.status_code != 200:
            raise Exception(f"Error fetching match IDs: {resp.status_code} {resp.text}")
        return resp.json()

    def get_match_timeline(self, match_id):
        url = f"https://{self.region}.api.riotgames.com/lol/match/v5/matches/{match_id}/timeline"
        resp = self.session.get(url, headers=self.headers)
        
        # Simple rate limit handling (very basic)
        if resp.status_code == 429:
            retry_after = int(resp.headers.get("Retry-After", 1))
            print(f"Rate limited. Waiting {retry_after} seconds...")
            time.sleep(retry_after)
            return self.get_match_timeline(match_id)
            
        if resp.status_code != 200:
            print(f"Error fetching timeline for {match_id}: {resp.status_code}")
            return None
        return resp.json()

    def get_match_details(self, match_id):
        url = f"https://{self.region}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        resp = self.session.get(url, headers=self.headers)
        if resp.status_code != 200:
            return None
        return resp.json()
