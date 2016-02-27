// <reference path="../typings/request/request.d.ts"/>

"use strict";

import request = require('request');
import qs = require('querystring');

import express = require('express');
import compression = require('compression');
import bodyParser = require('body-parser');

import oauthCredentials = require('./oauthCredentials.json');

Object.freeze(oauthCredentials); // preventive

interface OauthData{
    consumer_key: string,
    consumer_secret: string,
    token: string,
    token_secret: string,
    verifier: string
}

const oauthTokenToOauthData = new Map<string, OauthData>();

const app = express();
app.disable("x-powered-by");
app.disable("etag");

app.use(bodyParser.json({limit: "1mb"})); // for parsing application/json
app.use(compression());

app.post('/twitter/oauth/request_token', function(req, res){
    const callbackURL = req.body.callbackURL;
    console.log('body', req.body);
    console.log('callbackURL', callbackURL)
    // fresh object at each request
    const oauth = Object.assign({callback_url: encodeURIComponent(callbackURL)}, oauthCredentials);
    
    request.post(
        {
            url: 'https://api.twitter.com/oauth/request_token',
            oauth: oauth
        },
        function(err, response, body){
            if(err){
                res.status(502);
                res.send('Error discussing with Twitter: '+String(err));
                return;
            }

            console.log('status from Twitter', response.statusCode, body);

            // Ideally, you would take the body in the response
            // and construct a URL that a user clicks on (like a sign in button).
            // The verifier is only available in the response after a user has
            // verified with twitter that they are authorizing your app.

            // step 2
            const oauthTokenResponse = qs.parse(body);
            const token = oauthTokenResponse.oauth_token;
            oauthTokenToOauthData.set(token, Object.assign(
                {
                    token: token,
                    token_secret: oauthTokenResponse.oauth_token_secret
                },
                oauthCredentials
            ));

            const twitterAuthenticateURL = [
                'https://api.twitter.com/oauth/authenticate',
                '?',
                qs.stringify({oauth_token: token})
            ].join('');

            res.send(twitterAuthenticateURL);
        }
    )
});


app.get('/twitter/callback', function(req, res){
    res.send('<script>console.log("ouiiiiiiiii", location, location.query)</script>')
})

/*
    // step 3
    // after the user is redirected back to your server
    var auth_data = qs.parse(body)
    , oauth =
      { consumer_key: CONSUMER_KEY
      , consumer_secret: CONSUMER_SECRET
      , token: auth_data.oauth_token
      , token_secret: req_data.oauth_token_secret
      , verifier: auth_data.oauth_verifier
      }
    , url = 'https://api.twitter.com/oauth/access_token'
    ;
    request.post({url:url, oauth:oauth}, function (e, r, body) {
    // ready to make signed requests on behalf of the user
    var perm_data = qs.parse(body)
      , oauth =
        { consumer_key: CONSUMER_KEY
        , consumer_secret: CONSUMER_SECRET
        , token: perm_data.oauth_token
        , token_secret: perm_data.oauth_token_secret
        }
      , url = 'https://api.twitter.com/1.1/users/show.json'
      , qs =
        { screen_name: perm_data.screen_name
        , user_id: perm_data.user_id
        }
      ;
    request.get({url:url, oauth:oauth, qs:qs, json:true}, function (e, r, user) {
      console.log(user)
    })
    })
*/

app.listen('3737', function(){
    console.log('listening', 'http://localhost:3737/')
});