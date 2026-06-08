import requests
import re

import os
from dotenv import load_dotenv

from datetime import datetime

print(f"\n{'='*40}")
print(f"Run started: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
print('='*40)

load_dotenv()

QB_HOST = "https://qb.aryam.dev"

MAM_HEADERS = {"cookie": f"mam_id={os.getenv("MAM_COOKIE")}"}

def get_user_data():
    '''
    Fetches user data from MAM to determine free unsatisfied slots
    '''
    r = requests.get(
        "https://www.myanonamouse.net/jsonLoad.php",
        params={"snatch_summary": "true"},
        headers=MAM_HEADERS,
    )
    data = r.json()
    return {
        "classname": data["classname"],
        "unsat_count": data["unsat"]["count"],
        "unsat_limit": data["unsat"]["limit"],
    }


def get_torrents(page=0):
    '''
    Gets smallest torrents
    '''
    r = requests.post(
        "https://www.myanonamouse.net/tor/js/loadSearchJSONbasic.php",
        headers=MAM_HEADERS,
        data={
            "tor[sortType]": "sizeAsc",
            "tor[searchType]": "active",
            "tor[startNumber]": 1000*page,
            "perpage": 1000,
            "dlLink": True,
        },
    )
    return r.json().get("data", [])

def get_existing_mam_ids():
    r = requests.get(f"{QB_HOST}/api/v2/torrents/info")
    ids = set()
    for t in r.json():
        match = re.search(r"MID=(\d+)", t.get("comment", ""))
        if match:
            ids.add(int(match.group(1)))
    return ids

def add_torrent(dl_hash, name):
    requests.post(f"{QB_HOST}/api/v2/torrents/add", data={
        "urls": f"https://www.myanonamouse.net/tor/download.php/{dl_hash}",
        "category": "MAM Points Farm",
        "cookie": MAM_HEADERS["cookie"],
    })
    print(f"Added: {name}")

if __name__ == "__main__":
    user = get_user_data()
    
    print(f"Class: {user['classname']} | Unsat: {user['unsat_count']}/{user['unsat_limit']}")
    
    # Keeps 10% of slots free for desired torrents
    slots_available = int(0.9*(user["unsat_limit"] - user["unsat_count"])) 
    page = 0
    existing = get_existing_mam_ids()
    added = 0
    while slots_available > 0:
        torrents = get_torrents(page)
        print(f"Fetched page {page}")
        for t in torrents:
            if not slots_available: break
            if (t["id"] in existing) or t["dl"] == None:
                continue
            add_torrent(t["dl"], t["title"])
            added += 1
            slots_available -= 1
        page += 1
        print(f"Added {added} torrents")
    print(f"Done. Added {added} torrents.\n")
