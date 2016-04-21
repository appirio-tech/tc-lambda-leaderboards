var _ = require('lodash')
var elasticsearch = require('elasticsearch')
var es = {}
elasticsearch.Client = function() {
  return es
}

var mockEvent = {
  'body': {},
  params: {
    path: {},
    querystring: {
      filter: 'id%3D247%26type%3DMEMBER_SKILL'
    },
    header: {}
  },
  'stage-variables': {},
  context: {
    'account-id': '811668436784',
    'api-id': 'bd1cmoh5ag',
    'api-key': 'test-invoke-api-key',
    'authorizer-principal-id': '',
    caller: 'AIDAJUYC3TUFF3VEGQ5PQ',
    'cognito-authentication-provider': '',
    'cognito-authentication-type': '',
    'cognito-identity-id': '',
    'cognito-identity-pool-id': '',
    'http-method': 'GET',
    stage: 'test-invoke-stage',
    'source-ip': 'test-invoke-source-ip',
    user: 'AIDAJUYC3TUFF3VEGQ5PQ',
    'user-agent': 'Apache-HttpClient/4.3.4 (java 1.5)',
    'user-arn': 'arn:aws:iam::811668436784:user/nlitwin',
    'request-id': 'test-invoke-request',
    'resource-id': 'm3zey8',
    'resource-path': '/v3/members/_search'
  }
}


var chai = require("chai");
var expect = require("chai").expect,
  lambdaToTest = require('./index.js');

sinon = require("sinon");
chai.use(require('sinon-chai'));
var context = require('aws-lambda-mock-context');

var testLambda = function(event, ctx, resp) {
  // Fires once for the group of tests, done is mocha's callback to 
  // let it know that an   async operation has completed before running the rest 
  // of the tests, 2000ms is the default timeout though
  before(function(done) {
    //This fires the event as if a Lambda call was being sent in
    lambdaToTest.handler(event, ctx)
      //Captures the response and/or errors
    ctx.Promise
      .then(function(response) {
        resp.success = response;
        done();
      })
      .catch(function(err) {
        resp.error = err;
        done();
      })
  })
}

describe('When receiving an invalid request', function() {
  var resp = { success: null, error: null };
  var ctx = context()
  var myMock = _.cloneDeep(mockEvent)
  myMock.params.querystring.filter = 'type%3DINVALID_TYPE%26id%3D247'

  testLambda(myMock, ctx, resp)

  describe('then response object ', function() {
    it('should be an error object', function() {
      console.log(resp.error)
      expect(resp.error).to.exist
        .and.be.instanceof(Error)
    })

    it('should contain 400 error msg', function() {
      expect(resp.error.message).to.match(/400_BAD_REQUEST/)
    })
  })
})

describe('When receiving a valid search request', function() {
  var resp = { success: null, error: null }
  var ctx = context()

  es.search = function(input) {
    return Promise.resolve({
      "took": 31,
      "timed_out": false,
      "_shards": {
        "total": 5,
        "successful": 5,
        "failed": 0
      },
      "hits": {
        "total": 1,
        "max_score": 4.5115457,
        "hits": [{
          "_index": "members",
          "_type": "profile",
          "_id": "21159810",
          "_score": null,
          "_source": {
            "wins": 0,
            "updatedBy": "21159810",
            "challenges": 346,
            "homeCountryCode": "CAN",
            "handle": "darko_aleksic",
            "type": "jdbc",
            "otherLangName": "NIAL",
            "userId": 21159810,
            "tracks": [
              "DATA_SCIENCE"
            ],
            "skills": [{
              "score": 22,
              "name": "javascript",
              "id": 222,
              "sources": ["CHALLENGE"]
            },
            {
              "score": 33,
              "name": "AngularJS",
              "id": 222,
              "sources": ["CHALLENGE"]
            }]
          }
        }]
      }
    })
  }

  testLambda(mockEvent, ctx, resp)

  describe('then success response ', function() {
    var spy = sinon.spy(es, 'search')
    it('should be a valid response', function() {
      var result = resp.success.result
      console.log(result)
      expect(spy.calledOnce).to.be.true
      expect(resp.success.result).to.not.be.null
      expect(result.success).to.be.true
      expect(result.metadata).to.deep.equal({ totalCount: 1 })
      expect(result.status).to.equal(200)
      expect(result.content).to.have.lengthOf(1)
      // skills length and order
      expect(result.content[0].skills).to.have.lengthOf(2)
      expect(result.content[0].skills[0]).to.be.at.least(result.content[0].skills[1])
    })
  })
})
