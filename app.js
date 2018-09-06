const addr        = require('./utils/address');
const bodyParser  = require('body-parser');
const express 	  = require('express');
const redis       = require('redis');
const request     = require('request');
const rp          = require('request-promise');

const app         = express()
//var client      = redis.createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});

// assign app settings from envvironment || defaults
const port    = process.env.PORT || 8080;
const name    = process.env.HEROKU_APP_NAME || 'Unknown Name';
const version = process.env.HEROKU_RELEASE_VERSION || 'Unknown Version';

const deposit_address_list = addr.getAddressList('xlm');
const UPDATE_URL = 'https://api.abelegroup.io/monitoring/update_transaction';
const XLM_TX_URL = 'https://horizon.stellar.org/accounts/';

const addy = "GAWODYGKSK7IFJ6JNFWH222MGMHR6QWK6Q7BU3NJROFZ655HG7GL265O"

// parse application/json
app.use(bodyParser.json())

// set the home page route
app.get('/', function(req, res) {
  res.json({"name": name,"version": version}); 	
});

//
// Retrieve last transaction sent to pre-sale/sale XLM address
//
app.post('/transaction/update', function(req, res) {
  const errors = [];
  const promises = [];
  let count = 0;
  let total = 0;
  let txn_hash;
    
  for (var address of deposit_address_list) {
    const url = XLM_TX_URL + address +'/tx';
    console.log("Checking for txns at addy "+address+" using URL "+url);
    const options = { uri: url, json: true };
    promises.push(
      rp(options)
      .then(function(body) {
        if (JSON.parse(body)._embedded.records.length > 0) {
          for (var txn of JSON.parse(body)._embedded.records) {
            // check txn was received, not sent for the address 
            if (txn.to == address) {
              let data = {};
              console.log("Update for txn "+txn.id);
              data["wallet_address"] = txn.from;
              data["tx_id"] = txn.id;
              data["tx_hash"] = txn.id;
              data["amount"] = txn.amount;
              data["currency"] = 'XLM';
              count++;
              total += Number(txn.amount);
              request.post({
                url: UPDATE_URL,
                method: "POST",
                json: true,
                body: data
              },
              function (error, response, body) {
                if (response.statusCode == 200) {
                  console.log("Updated "+txn_hash+ " successfully for sending wallet"+data.wallet_address+" and amount "+data.amount);
                } else {
                  console.log("txn update "+data.tx_hash+ " for wally "+data.wallet_address+" failed. status "+response.statusCode+", error was "+body.error);
                  errors.push("Error " +response.statusCode+"  while updating wallet "+data.wallet_address+" - "+body.error);
                }
              });
            }
          }
          const ts = +new Date();
        } else {
          console.log("Address "+address+" has zero transactions");
        }
      })
      .catch(function (err) {
        errors.push("Error while updating transactions for XLM address "+address+" - "+err);;
      })
    );
  }
  Promise.all(promises)
  .then(function(values) {
     if (errors && errors.length > 0) {
       res.send({ status: 500, errors: errors });
     } else {
       res.send({ status: 200, errors: errors });
     }
  });
});

// Start the app listening to default port
app.listen(port, function() {
   console.log(name + ' app is running on port ' + port);
   console.log("checking for transactions on address list "+deposit_address_list.join(", "));
});
