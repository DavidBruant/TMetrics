'use strict';

/*
    if access to Twitter API, have a pagemod
    if no access to Twitter API, no need for a pagemod

*/

const {PageMod} = require("sdk/page-mod");
const {data} =  require("sdk/self");

const getAccessToken = require('./getAccessToken.js');
const getTimelineOverATimePeriod = require('./getTimelineOverATimePeriod.js'); 
const TwitterAPI = require('./TwitterAPI.js');

const ONE_DAY = 24*60*60*1000;

let lastTwitterAPICredentials;
let lastAccessToken;


// create the pageMod inconditionally
// if the browser was offline initially, an access token couldn't be acquired
// the pageMod will verify if there is an access token at each attach event (and retry)
const twitterProfilePageMod = PageMod({
    include: /^https?:\/\/twitter\.com\/([^\/]+)\/?$/,

    contentScriptFile: [
        data.url("ext/react.js"),
        data.url("metrics-integration/TweetMine.js"),
        
        data.url("metrics-integration/components/Metrics.js"),
        data.url("metrics-integration/components/TwitterAssistantTopInfo.js"),
        data.url("metrics-integration/components/Histogram.js"),
        data.url("metrics-integration/components/DetailList.js"),
        data.url("metrics-integration/components/TimelineComposition.js"),
        data.url("metrics-integration/components/GeneratedEngagement.js"),
        data.url("metrics-integration/components/HumansAreNotMetricsReminder.js"),
        data.url("metrics-integration/components/TwitterAssistant.js"),
        
        data.url("metrics-integration/main.js")
    ],
    contentScriptWhen: "start", // mostly so the 'attach' event happens as soon as possible

    contentStyleFile: data.url("metrics-integration/main.css")
});

twitterProfilePageMod.on('attach', function onAttach(worker){
    const matches = worker.url.match(/^https?:\/\/twitter\.com\/([^\/]+)\/?$/);

    if(!Array.isArray(matches) || matches.length < 2)
        return;
    const user = matches[1];
    
    // now, variable user contains a screen_name
    //console.log('user', user);
    
    const twitterAPI = TwitterAPI(lastAccessToken);
    
    twitterAPI.lookupUsers([], [user]).then(users => {
        worker.port.emit('current-user-details', users[0]);
    });
    
    /*twitterAPI.search({
        q: {
            '@': user
        }
    })
    .then(tweets => console.log("tweets to user", user, tweets))
    .catch(e => console.error(e))*/
    
    if(!lastAccessToken){
        getAccessToken(lastTwitterAPICredentials.key, lastTwitterAPICredentials.secret)
            .then(accessToken => {
                lastAccessToken = accessToken;
                
                // retry now that we have a token (but only if the worker is relevant at all)
                if(worker.tab)
                    onAttach(worker); 
            })
    }
    else{
        const getTimelineWithProgress = getTimelineOverATimePeriod(lastAccessToken);
        const timelineComplete = getTimelineWithProgress({
            username: user,
            timestampFrom: (new Date()).getTime() - ONE_DAY*40,
        }, sendTimelineToContent);
        
        timelineComplete.then(sendTimelineToContent).catch( err => {
            // TODO consider invalidating lastAccessToken here
            console.error('error while getting the user timeline', user, err);
        });
    }
    
    function sendTimelineToContent(timeline){
        worker.port.emit('twitter-user-data', timeline);
    }
    
    worker.port.on('ask-users', userIds => {
        twitterAPI.lookupUsers(userIds).then(users => {
            worker.port.emit('answer-users', users)
        })
    });
    
    
});


module.exports = function(twitterAPICredentials){
    // save credentials for later in case we're not connected yet 
    lastTwitterAPICredentials = twitterAPICredentials;
    lastAccessToken = undefined; // forget previous token since it's likely not in sync with the new API credentials
    
    return getAccessToken(twitterAPICredentials.key, twitterAPICredentials.secret)
        .then(accessToken => {
            lastAccessToken = accessToken;
        });
    
}