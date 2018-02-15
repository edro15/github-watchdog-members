'use latest';
import twilio from 'twilio';

const axios = require('axios');
var Set = require("collections/set");


 /**
 * Returns members' login attribute.
 * @param {JSON} data
 * @returns {Array} members
 */
function getMembersId(data){
  var members = [];
  for (var idx in data) {
    members.push(data[idx].login);
  }
  // console.log(members);
  return members;
}


 /**
 * Compare received member names with stored ones 
 * and returns the difference.
 * @param {Array} arr_old
 * @param {Array} arr_new
 * @returns {Set} Difference 
 */
function getDataDiffs(arr_old, arr_new) {
  var newset = new Set(arr_new);
  var oldset = new Set(arr_old);
  return newset.difference(oldset);
}


/**
* @param context {WebtaskContext}
*/
module.exports = function(context, cb) {
  
  // Getting data from github
  // NOTE: limited to 100 members. Requires paginator to support more members.
  axios.get('https://api.github.com/orgs/auth0/members', { 
        params: {
          per_page: 100
        }
      })
      .then((response) => {
        // Filtering received data
        var members = getMembersId(response.data);
        
        // Handling data from storage
        context.storage.get(function (error, storagedata) {
          if (error) return cb(error);
          var diff = getDataDiffs(storagedata, members);
          if (diff.length > 0) {
            console.log('Updating member names in storage');

            context.storage.set(members, function (error) {
              if (error) return cb(error);
              
              // Notifying admins via SMS 
              const { TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_DEST_NUM } = context.secrets;
              // Using Twilio test number
              const from_number = '+15005550006'; 
              const client = new twilio.RestClient(TWILIO_SID, TWILIO_AUTH_TOKEN);
              client.messages.create({
                body: "Member names updated: [" + diff.length + "] changed.",
                to: TWILIO_DEST_NUM,
                from: from_number,
              }, (err, message) => {
                if (err) return cb(err);
                cb(null, { members: { total: members.length, names: members }, notification: 'OK' });
              });
              
            });
      
          } else {
            console.log('Storage up to date');
            cb(null, { members: { total: members.length, names: members } });
          }
        });

      })
      .catch((err) => {
        console.log(err);
        cb(err);
      })

};
