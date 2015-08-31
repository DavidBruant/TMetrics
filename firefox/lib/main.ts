"use strict";

import ui =  require("sdk/ui");
import selfModule =  require("sdk/self");
import tabs = require("sdk/tabs");
import system = require("sdk/system");
import timersModule = require("sdk/timers");

import prefModule = require('sdk/simple-prefs');
import lowLevelPrefs = require('sdk/preferences/service');
import storageModule = require("sdk/simple-storage");

import getAccessToken = require('./getAccessToken');
import guessAddonUserTwitterName = require('./guessAddonUserTwitterName');
import getReadyForTwitterProfilePages = require('./getReadyForTwitterProfilePages');
import makeCredentialsPanel = require('./makeCredentialsPanel');


var data = selfModule.data;
var setTimeout = timersModule.setTimeout;
var staticArgs = system.staticArgs;
var prefs = prefModule.prefs;
var storage = storageModule.storage;
    
    

var TWITTER_MAIN_PAGE = "https://twitter.com";
var TWITTER_USER_PAGES = [
    "https://twitter.com/DavidBruant"/*,
    "https://twitter.com/rauschma",
    "https://twitter.com/nitot",
    "https://twitter.com/guillaumemasson",
    "https://twitter.com/angustweets"*/

    // https://twitter.com/BuzzFeed // for an account with LOTS of tweets
    // https://twitter.com/dupatron has no tweets at this point 
];

/*throw 'Apparently retweet details are broken + Need to test whether addon user infos are properly fetched, then propagated to the tweetMine to compute the number nia nia nia + Make sure the "no logged in addon user" case is taken care of + add trim_user everywhere';*/

declare var process: any;

export var main = function(){
    
    /*
        SETUP
    */
    
    prefs["sdk.console.logLevel"] = 'all';
    
    
    
    /*
        ACTUAL MAIN
    */
    
    var storedTwitterAPICredentials = storage.credentials ? JSON.parse(storage.credentials) : {};
    
    // use the values passed as static args in priority;
    var key = lowLevelPrefs.get("TWITTER_ASSISTANT_CONSUMER_KEY") || storedTwitterAPICredentials.key;
    var secret = lowLevelPrefs.get("TWITTER_ASSISTANT_CONSUMER_SECRET") || storedTwitterAPICredentials.secret;

    if(lowLevelPrefs.get("TWITTER_ASSISTANT_CONSUMER_KEY") && lowLevelPrefs.get("TWITTER_ASSISTANT_CONSUMER_SECRET")){
        setTimeout(() => { 
            TWITTER_USER_PAGES.forEach(url => tabs.open(url));
        }, 3*1000);
    }
    
    var credentialsPanel = makeCredentialsPanel();
    
    // button
    var twitterAssistantButton = new ui.ActionButton({
        id: "twitter-assistant-credentials-panel-button",
        label: "Twitter Assistant panel",
        icon: data.url('images/Twitter_logo_blue.png'),
        onClick: state => {
            credentialsPanel.show({position: twitterAssistantButton});
        }
    });
    
    
    if(key && secret){
        getReadyForTwitterProfilePages({key:key, secret:secret});
        
        credentialsPanel.port.emit('working-app-credentials', {key: key, secret: secret});
    }
    else{ // no credentials stored. Ask some to the user
        console.time('guess');
        guessAddonUserTwitterName().then(username => {
            console.timeEnd('guess');
            
            credentialsPanel.port.emit('update-logged-user', username);
        });
        
        credentialsPanel.show({position: twitterAssistantButton});
    }
    
};


