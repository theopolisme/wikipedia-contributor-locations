#!/usr/bin/env python

import os
import sys

os.environ['APP_ROOT'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app')
os.environ['IS_PRODUCTION'] = 'true'
sys.path.insert(1, '/data/project/wikipedia-contributor-locations/venv/lib/python2.7/site-packages')

from flup.server.fcgi import WSGIServer
from flask import request

from app import app

import time
import logging
from logging import FileHandler

logger = FileHandler('error.log')
app.logger.setLevel(logging.DEBUG)
app.logger.addHandler(logger)
app.logger.debug(u'Flask server started ' + time.asctime())

@app.after_request
def write_access_log(response):
    app.logger.debug(u'%s %s -> %s' % (time.asctime(), request.path, response.status_code))
    return response

if __name__ == '__main__':
    WSGIServer(app).run()
