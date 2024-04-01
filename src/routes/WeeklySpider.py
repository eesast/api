import json
import requests
import time
import random
import yaml
import datetime
from bs4 import BeautifulSoup
import openpyxl
import datetime

def main():
    file_data = '''
    cookie : qq_domain_video_guid_verify=bc2b95a0b03225df; _qimei_uuid42=1810b1616231000c75e2e25459ed3c859c80921186; _qimei_q36=; pgv_pvid=3615070672; ua_id=sXYcowh4EwQqofCiAAAAAJRCzBvxjjpTcjkXlriKupg=; wxuin=05930234975962; _qimei_h38=9b4774c31ab0e93530415d4902000001018113; pac_uid=0_68733c3ab444a; iip=0; _qimei_fingerprint=c8931422ec3117f0921bbfaa4af67ed0; tvfe_boss_uuid=755730c575177bd8; RK=D31Mgg3T0C; ptcz=09735fdbeb017f7cab092b2bc276926cb6091023045f6d7f8dcc82702917c404; rewardsn=; wxtokenkey=777; cert=UlYgIJeskPhVUSzhX6FoljI679BZ5o29; sig=h013dbe5e6397e98f21e98d0e423db75277c18209cd2b94b2bc122f92eb0f43d2da86b5ee57a757a4b9; noticeLoginFlag=1; _clck=1dubszy|1|fkg|0; uuid=2275258fc33127a7464f73df46981347; bizuin=3945677232; ticket=3e9f9f452cdbced6ccbe88611b0edf950a1e91fa; ticket_id=gh_5f7cab1e6015; slave_bizuin=3945677232; remember_acct=2248278431%40qq.com; rand_info=CAESIJ2E8d9+mqZtiEL6KfNzUu1q+ZE/T1t8ELhQNhYtqMun; data_bizuin=3945677232; data_ticket=cI8ai2kIj5lm+b+8qbzva/NTiksKEqoO2vPG9jwtxavFrsYyXHI//8UA2cTJpopz; slave_sid=UnY4ZW5Dem9hbVZLRkV3OUREbnRKTmp3WXpWeGIybXRUQmVpWktpQnVZempfcjZkR3EycXhiY0RTRHhWanNrY3BQaE1JSHNZeGRtZkZZN0FfQWhybVVvWVhQY1NoT1Qxc0trMlZKVEIzbXRfS2ZxaFI3ZlZ1ZmNsdDRMVzhISmVUQWRNc01qamFrRjVVc3B5; slave_user=gh_5f7cab1e6015; xid=a3aa7f9a5ce14b56488127e0481141f8; openid2ticket_osEEu66o-Jtb8w5e2TU4tqIRjF-E=0D4x7pYP+k8Wc7N1STD0N+0J+m0lplsJ+fswxah1npc=; mm_lang=zh_CN; _clsk=1jcn2c0|1711606279220|3|1|mp.weixin.qq.com/weheat-agent/payload/record
    fakeid : MzA5MjA5NjIxNg%3D%3D
    token : 1245356384
    user_agent: xxxxMozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36
    '''
    config = yaml.safe_load(file_data)

    headers = {
        "Cookie": config['cookie'],
        "User-Agent": config['user_agent']
    }

    # 请求参数
    url = "https://mp.weixin.qq.com/cgi-bin/appmsg"
    begin = "0"
    params = {
        "action": "list_ex",
        "begin": begin,
        "count": "5",
        "fakeid": config['fakeid'],
        "type": "9",
        "token": config['token'],
        "lang": "zh_CN",
        "f": "json",
        "ajax": "1"
    }

    # 存放结果
    app_msg_list = []

    i = 0
    while True:
        begin = i * 5
        params["begin"] = str(begin)
        # 随机暂停几秒，避免过快的请求导致过快的被查到
        time.sleep(random.randint(1, 10))
        resp = requests.get(url, headers=headers, params=params, verify=False)

        # 微信流量控制, 退出
        if resp.json()['base_resp']['ret'] == 200013:
            print("frequencey control, stop at {}".format(str(begin)))
            time.sleep(600)
            continue

        # 如果返回的内容中为空则结束
        if len(resp.json()['app_msg_list']) == 0:
            print("all article parsed")
            break

        msg = resp.json()
        if "app_msg_list" in msg:
            for item in msg["app_msg_list"]:
                if "SAST Weekly" in str(item['title']):
                  date = datetime.datetime.fromtimestamp(item['create_time'])
                  with open('NewlyUpdate.json', 'w') as f:
                    if date not in datetime.date.today():
                      json.dump("none", f)
                    else:
                      json.dump(str(item['link']),f)
                  return
        i += 1

if __name__ == '__main__':
    main()
