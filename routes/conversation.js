/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
require('dotenv').config({silent: true});

const watson = require('watson-developer-cloud'); // watson sdk

// Create the service wrapper
const conversation = watson.conversation({
  // If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
  // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
  username: process.env.CONVERSATION_USERNAME || '<username>',
  password: process.env.CONVERSATION_PASSWORD || '<password>',
  version_date: process.env.CONVERSATION_VER || '2017-05-26',
  version: 'v1'
});

/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Conversation service
 * @param  {Object} response The response from the Conversation service
 * @return {Object}          The response with the updated message
 */
const updateMessage = (input, response) => {
  var responseText = null;
  if (!response.output) {
    response.output = {};
  } else {
    return response;
  }
  if (response.intents && response.intents[0]) {
    var intent = response.intents[0];
    // Depending on the confidence of the response the app can return different messages.
    // The confidence will vary depending on how well the system is trained. The service will always try to assign
    // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
    // user's intent . In these cases it is usually best to return a disambiguation message
    // ('I did not understand your intent, please rephrase your question', etc..)
    if (intent.confidence >= 0.75) {
      responseText = 'Understood intent ' + intent.intent;
    } else if (intent.confidence >= 0.5) {
      responseText = 'Assumed intent ' + intent.intent;
    } else {
      responseText = 'Not understood';
    }
  }
  response.output.text = responseText;
  return response;
};


module.exports = function(app) {

  app.post('/api/message', (req, res, next) => {
    const workspace = process.env.WORKSPACE_ID || '<workspace-id>';
    if (!workspace || workspace === '<workspace-id>') {
      return res.json({
        output: {
          text: 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' +
            '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> ' +
            'documentation on how to set this variable. <br>' +
            'The chat session will only be functional after a conversation with intents and dialogue are defined using the Watson tooling'
        }
      });
    }
    const payload = {
      workspace_id: workspace,
      context: req.body.context || {},
      input: req.body.input || {}
    };

    // Send the input to the conversation service
    conversation.message(payload, (error, data) => {
      if (error) {
        return next(error);
      }
      return res.json(updateMessage(payload, data));
    });
  });
};
