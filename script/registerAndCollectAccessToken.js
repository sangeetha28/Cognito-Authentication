// Require SDKs
var AWS = require('aws-sdk');
var AWSCognito = require('amazon-cognito-identity-js');
var fs = require('fs');
var json2csv = require('json2csv');
var globals = require('./global');

const uniqueRandom = require('unique-random');

// Get SDK Objects
var AuthenticationDetails = AWSCognito.AuthenticationDetails;
var CognitoUser = AWSCognito.CognitoUser;
var CognitoUserAttribute = AWSCognito.CognitoUserAttribute;
var CognitoUserPool = AWSCognito.CognitoUserPool;

// Setup Cognito Pool Details
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: globals.IDENTITY_POOL_ID
});

AWS.config.region = 'eu-west-1';
AWS.config.update({ accessKeyId: '', secretAccessKey: ''});

var userPool = new CognitoUserPool({
    UserPoolId: globals.USER_POOL_ID,
    ClientId: globals.CLIENT_ID
});

function createUser(callback) {
    // Whatever you want to do after the wait
    const rand = uniqueRandom(1156542312344590, 71956542312344512);

    var randomNumber = rand();
    var userName = `loadtest_${randomNumber}@sharklasers.com`;

    var cognitoUserAttributeList = createCognitoAttributes(userName, randomNumber);

    callback(null, {
        userName: userName,
        user: {
            getUserName: function() {
                return 'test';
            }
        }
    });

    // userPool.signUp(
    //     `${randomNumber}`,
    //     'password',
    //     cognitoUserAttributeList,
    //     null,
    //     function(err, data) {
    //         data = data || {};
    //         data.userName = userName;
    //         callback(err, data);
    //     }
    // );
}

var collectAccessTokens = function (currentUser) {
    var emailAddress = currentUser;
    var uId = emailAddress.replace(/['"]+/g, '');


    var authenticationDetails = new AuthenticationDetails({
        Username: uId,
        Password: 'password'
    });

    var cognitoUser = new CognitoUser({
        Username: uId,
        Pool: userPool
    });

    var authenticateUser = cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (function () {
            var email = authenticationDetails.username;
            return function (newresult) {
                var accessToken = newresult.getAccessToken().getJwtToken();
                var refreshToken = newresult.getRefreshToken().getToken();
                // var idToken = newresult.idToken.jwtToken; // not needed right now
                var writeOutput = {
                    'EmailAddress': email,
                    'RefreshToken': refreshToken,
                    'AccessToken': accessToken
                };
                writeOutputToAFile(writeOutput);
            }
        })(),

        onFailure: function (err1) {
            console.log(err1);
        }
    });


    var writeOutputToAFile = function (output) {
        var fileName = '../userData/usersWithAccessTokenTogether.csv';
        var fields = ['EmailAddress', 'RefreshToken', 'AccessToken'];
        var newLine = "\r\n";

        var toCsv = {
            data: output,
            fields: fields,
            hasCSVColumnTitle: false
        };

        fs.stat(fileName, function (err, stat) {
            if (err == null) {
                var csv = (json2csv(toCsv) + newLine).replace(/['"]+/g, '');
                fs.appendFile(fileName, csv, function (err) {
                    if (err) throw err;
                    console.log('The "data to append" was appended to file!');
                });
            }
            else {
                console.log('New file, just writing headers');
                fields = (fields + newLine);
                fs.writeFile(fileName, fields, function (err, stat) {
                    if (err) throw err;
                    console.log('file saved');
                });
                var csv = (json2csv(toCsv) + newLine).replace(/['"]+/g, '');
                fs.appendFile(fileName, csv, function (err) {
                    if (err) throw err;
                    console.log('The "data to append" was appended to file!');
                });
            }
        });
    }
};

function createCognitoAttributes(userName, randomNumber) {
    var attributeList = [];

    var attributeEmail = new CognitoUserAttribute({
        Name: 'email',
        Value: userName
    });

    var attributeFirstName = new CognitoUserAttribute({
        Name: 'name',
        Value: `Firstname_${randomNumber}`
    });

    var attributeLastName = new CognitoUserAttribute({
        Name: 'family_name',
        Value: `Lastname_${randomNumber}`
    });

    var attributePhoneNumber = new CognitoUserAttribute({
        Name: 'phone_number',
        Value: '+077432145687'
    });

    var attributeCustomMarketing = new CognitoUserAttribute({
        Name: 'custom:marketing',
        Value: 'true'
    });

    attributeList.push(attributeEmail);
    attributeList.push(attributeFirstName);
    attributeList.push(attributeLastName);
    attributeList.push(attributePhoneNumber);
    attributeList.push(attributeCustomMarketing);
    return attributeList;
}

// Create Users

var numberOfUsersToCreate = 100;
var i = 0;

function callback(err, result) {
    if (!err) {
        var cognitoUser = result.user;
        console.log('user name is - ' + cognitoUser.getUsername());
        var userIdentifier = result.userName;
        console.log('email - ' + userIdentifier);
        collectAccessTokens(userIdentifier);
    } else {
        console.log(err);
    }

    if (i++ < numberOfUsersToCreate) {
        setTimeout(function() {
            createUser(callback)
        }, 500 * i);
    }
}

createUser(callback);