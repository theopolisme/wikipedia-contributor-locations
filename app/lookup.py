from mw import get_site
from geoip import geolite2

# Latitude and longitude points to skip, because they default to the center of the
# country when the location is not known, obviously not desirable for a dot map
# @link http://forum.maxmind.com/viewtopic.php?f=13&t=5420
skip_list = [
    (38.0, -97.0), # United States
    (51.5, -0.13) # England
]

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
                # Malformed ip address
                continue

            if match is not None and match.location and match.location not in skip_list:
                yield match.location

if __name__ == '__main__':
    # Demo purposes
    print 'Demo: Apple @ en.wiki'
    for location in get_locations('Apple','en.wikipedia.org'):
        print location
