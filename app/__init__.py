import time
import os
import json
from functools import wraps

from werkzeug.contrib.cache import SimpleCache, RedisCache
from flask import Flask, render_template, jsonify, request
from flask.ext.assets import Environment

from lookup import get_locations

CACHE_PREFIX = 'rzTOb6828NtZ5/9vVkxhGd+3CivIBDQLfQPQBrT7WW8='
CACHE_TIMEOUT = 30 * 60

app = Flask(__name__)
assets = Environment(app)

if os.environ.get('IS_PRODUCTION'):
    cache = RedisCache(host='tools-redis', port=6379, default_timeout=CACHE_TIMEOUT, key_prefix=CACHE_PREFIX)
else:
    cache = SimpleCache()

# Modified from http://flask.pocoo.org/docs/0.10/patterns/viewdecorators/#caching-decorator
def cached(timeout=CACHE_TIMEOUT, key='view/{path}/{args}'):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            cache_key = key.format(path=request.path, args=json.dumps(request.form if request.method == 'POST' else request.args))
            rv = cache.get(cache_key)
            if rv is not None:
                return rv
            rv = f(*args, **kwargs)
            cache.set(cache_key, rv, timeout=timeout)
            return rv
        return decorated_function
    return decorator

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/locations', methods=['GET', 'POST'])
@cached()
def locations():
    start_time = time.time()
    data = request.form if request.method == 'POST' else request.args

    if 'title' in data:
        title = data['title']
    else:
        return jsonify(
            success=False,
            message='Missing paramater: `title` must be specified, e.g. "Apple".'
        )

    if 'base_url' in data:
        base_url = data['base_url']
    else:
        return jsonify(
            success=False,
            message='Missing paramater: `base_url` must be specified, e.g. "en.wikipedia.org".'
        )

    try:
        locations = [l for l in get_locations(title, base_url)]
    except:
        return jsonify(
            success=False,
            message='An error occurred while getting the location data. Please wait a litte while and try again.'
        )

    return jsonify(
        success=True,
        locations=locations,
        elapsed=time.time() - start_time
    )

if __name__ == "__main__":
    app.run(debug=True)
