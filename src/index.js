/** == Imports == */
var AWS = require('aws-sdk'),
  _ = require('lodash');

/*
 * The AWS credentials are picked up from the environment.
 * They belong to the IAM role assigned to the Lambda function.
 * Since the ES requests are signed using these credentials,
 * make sure to apply a policy that allows ES domain operations
 * to the role.
 */
var creds = new AWS.EnvironmentCredentials('AWS');
var querystring = require('querystring')
var es = require('elasticsearch').Client({
  hosts: process.env.MEMBER_ES_HOST,
  apiVersion: '1.5',
  connectionClass: require('http-aws-es'),
  amazonES: {
    region: "us-east-1",
    credentials: creds
  }
});

String.prototype.endsWith = function(str) {
  var lastIndex = this.lastIndexOf(str);
  return (lastIndex !== -1) && (lastIndex + str.length === this.length);
}

/**
 * Entry point for lambda function handler
 */
exports.handler = function(event, context) {
  console.log('Received event:', JSON.stringify(event, null, 2));
  var filter = _.get(event, 'queryParams.filter', '')
  filter = querystring.parse(decodeURIComponent(filter))
  var type = _.get(filter, 'type', null)


  // convert query params to JSON
  switch (type) {
    case 'MEMBER_SKILL':
      // make sure name param was passed is non-empty
      var skillName = _.get(filter, 'name', '')
        query = getQuery(type, {skillName: skillName})
      if (skillName.length == 0) {
        context.fail(new Error("400_BAD_REQUEST: 'name' param is currently required to filter"));
      } else if (!query) {
        context.fail(new Error("500_INTERNAL_ERROR: could not find query to load data"));
      } else {
        es.search({
          index: 'members',
          type: 'profile',
          body: query
        }).then(function(resp) {
          var content = resp.hits.hits.map(function(obj) {
            // remove suggest prop from response
            delete obj._source.suggest
            return obj._source;
          });
          context.succeed(wrapResponse(context, 200, content, resp.hits.total))
        }, function(err) {
          context.fail(new Error("500_INTERNAL_ERROR " + err.message));
        })
      }
      break
    
    default:
      context.fail(new Error('400_BAD_REQUEST: Unrecognized type "' + type + '"'));
  }
}


function wrapResponse(context, status, body, count) {
  return {
    id: context.awsRequestId,
    result: {
      success: status === 200,
      status: status,
      metadata: {
        totalCount: count
      },
      content: body
    }
  }
}

/**
 * @brief Return query object for specific type
 * 
 * @param queryName - name of the query to return
 * @param data - any dynamic data that needs to be inserted
 * 
 * @return ES query
 */
function getQuery(queryName, data) {
  switch (queryName) {
    case 'MEMBER_SKILL':
      return {
        "from": 0,
        "size": 10,
        "query": {
          "nested": {
            "path": "skills",
            "query": {
              "match": { "skills.name": data.skillName }
            }
          }
        },
        "sort": [{
            "skills.score": {
              "order": "desc",
              "nested_filter": {
                "term": {
                  "skills.name": data.skillName
                }
              }
            }
          },
          { "wins": "desc" }
        ],
        "_source": { "exclude": ['financial', 'firstName', 'lastName', 'addresses', 'email']}
      }
    default: 
      return null
  }
}