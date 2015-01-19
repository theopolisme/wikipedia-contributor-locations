import os
import mwclient

useragent = 'wikipedia-contributor-locations (User:Theopolisme) / mwclient {}'.format(mwclient.__ver__)
username = os.environ.get('WIKIPEDIA_USERNAME')
password = os.environ.get('WIKIPEDIA_PASSWORD')

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
