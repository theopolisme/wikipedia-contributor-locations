wikipedia-contributor-locations
==

**[https://tools.wmflabs.org/wikipedia-contributor-locations](https://tools.wmflabs.org/wikipedia-contributor-locations)**

Visualize the locations of contributors to particular Wikipedia articles on a world map.

Under the hood, the system works with a Python backend that performs MediaWiki API requests to get the IP address of each revision to the article, then uses MaxMind's free IP->location database to associate locations with geodata. On the client side, this information is rendered using leaflet.js.
 
Currently running on wmflabs.
 
## Setup

 - clone the repository
 - run `pip install -r requirements.txt`
 - `python __init__/app.py`
 - done, you can now access the app at `localhost:5000`

## wmflabs

 - clone the repository
 - copy `.lighttpd.conf` to the tool root directory
 - `webservice2 --release="trusty" start`
 - done, you can now access the app at tools.wmflabs.org/TOOL_NAME
