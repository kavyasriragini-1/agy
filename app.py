import os
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        entries = []
        for entry in root.findall('atom:entry', ns):
            title_el = entry.find('atom:title', ns)
            id_el = entry.find('atom:id', ns)
            updated_el = entry.find('atom:updated', ns)
            content_el = entry.find('atom:content', ns)
            
            title = title_el.text if title_el is not None else ""
            id_val = id_el.text if id_el is not None else ""
            updated = updated_el.text if updated_el is not None else ""
            content = content_el.text if content_el is not None else ""
            
            # Find the link
            link = ""
            for l_el in entry.findall('atom:link', ns):
                rel = l_el.attrib.get('rel')
                href = l_el.attrib.get('href')
                if rel == 'alternate' or not rel:
                    link = href
                    break
            
            entries.append({
                'title': title, # Typically the date
                'id': id_val,
                'updated': updated,
                'link': link,
                'content': content
            })
        return entries, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    entries, error = fetch_and_parse_feed()
    if error:
        return jsonify({'success': False, 'error': error}), 500
    return jsonify({'success': True, 'entries': entries})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
