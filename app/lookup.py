import os

import mwclient
from geoip import geolite2

useragent = 'wikipedia-contributor-locations (User:Theopolisme) / mwclient {}'.format(mwclient.__ver__)
username = os.environ.get('WIKIPEDIA_USERNAME')
password = os.environ.get('WIKIPEDIA_PASSWORD')

# Latitude and longitude points to skip, because they default to the center of the
# country when the location is not known, obviously not desirable for a dot map
# @link http://forum.maxmind.com/viewtopic.php?f=13&t=5420
skip_list = [
    (38.0, -97.0), # United States
    (51.5, -0.13) # England
]

sites = {}
def get_site(base_url):
    """Returns a `mwclient.Site` with the provided base_url, with the correct
    useragent and logged in if username/password specified.
    """
    if base_url in sites:
        return sites[base_url]

    site = mwclient.Site(('https',base_url), clients_useragent=useragent)
    if username and password:
        site.login(username, password)

    return site

def get_locations(title, base_url):
    """A generator that yields the locations of all edits to a particular `title` on
    a certain `base_url`.
    """
    site = get_site(base_url)
    page = site.Pages[title]
    revisions = page.revisions(dir='newer', limit='max', prop='user')
    for revision in revisions:
        if 'anon' in revision:
            try:
                match = geolite2.lookup(revision['user'])
            except ValueError:
                print 'Skipping malformed IP address "{}"'.format(revision['user'])
                continue

            if match is not None and match.location and match.location not in skip_list:
                yield match.location

if __name__ == '__main__':
    # Demo purposes
    print 'Demo: Apple @ en.wiki'
    for location in get_locations('Apple','en.wikipedia.org'):
        print location
