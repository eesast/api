from selenium import webdriver
from selenium.webdriver.common.by import By
import time
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
import json
import io
import re
from PIL import Image
import sys

fakeid="MzA5MjA5NjIxNg%3D%3D"
token=""
cookie=""
user_agent=""

option= webdriver.ChromeOptions()
option.add_argument('--headless')
driver = webdriver.Chrome(options=option)

driver.get("https://mp.weixin.qq.com")
time.sleep(2)
# 截图二维码
screenshot = driver.get_screenshot_as_png()
with open("screenshot.png", "wb") as file:
    file.write(screenshot)
img = Image.open(io.BytesIO(screenshot))
img.show()

# Check if the URL has changed
while driver.current_url != "https://mp.weixin.qq.com": 
    time.sleep(1)
    
button=driver.find_element(By.XPATH,'//*[@id="app"]/div[2]/div[3]/div[2]/div/div[2]')
#图文消息
button.click()

button2=driver.find_element(By.XPATH,'//*[@id="js_editor_insertlink"]')
button2.click()
#超链接
button3=driver.find_element(By.XPATH,'//*[@id="vue_app"]/div[2]/div[1]/div/div[2]/div[2]/form[1]/div[4]/div/div/p/div/button')
button3.click()
#选择其他公众号
input_box = driver.find_element(By.XPATH,'//*[@id="vue_app"]/div[2]/div[1]/div/div[2]/div[2]/form[1]/div[4]/div/div/div/div/div[1]/span/input')

# 使用元素的 "send_keys()" 方法输入文本
input_box.send_keys("无限之声\n")

button4=driver.find_element(By.XPATH,'//*[@id="vue_app"]/div[2]/div[1]/div/div[2]/div[2]/form[1]/div[4]/div/div/div/div[2]/ul/li[1]/div[1]/strong')
button4.click()
for request in driver.requests:
    if request.response and 'appmsgpublish' in request.url:
        pattern = r"token=(\d+)"
        match = re.search(pattern, request.url)
        if match:
            token = match.group(1)
        cookie=str(request.headers['Cookie'])
        user_agent=str(request.headers['User-Agent'])
        sys.stdout.write(cookie+"\n"+fakeid+"\n"+token+"\n"+user_agent+"\n")
time.sleep(1)
# 关闭浏览器
driver.quit()