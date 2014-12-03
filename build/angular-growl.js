/**
 * angular-growl-v2 - v0.7.4 - 2014-12-03
 * http://janstevens.github.io/angular-growl-2
 * Copyright (c) 2014 Marco Rinck,Jan Stevens; Licensed MIT
 */
angular.module('angular-growl', []);
angular.module('angular-growl').directive('growl', [function () {
    'use strict';
    return {
      restrict: 'A',
      templateUrl: 'templates/growl/growl.html',
      replace: false,
      scope: {
        reference: '@',
        inline: '@',
        limitMessages: '='
      },
      link: function (scope, element, attrs) {
        element.on('click', function (event) {
          //console.log(event);
          event.preventDefault();
          if (event.target.className.toLowerCase().indexOf('close-notification') !== -1) {
            console.log('Closing Message');
            scope.growlMessages = [];
          }
          if (event.target.className.toLowerCase().indexOf('reload-page') !== -1) {
            console.log('Reloading page');
            window.location.reload();
            event.preventDefault();
          }
        });
      },
      controller: [
        '$scope',
        '$timeout',
        'growl',
        'growlMessages',
        function ($scope, $timeout, growl, growlMessages) {
          $scope.referenceId = $scope.reference || 0;
          growlMessages.initDirective($scope.referenceId, $scope.limitMessages);
          $scope.growlMessages = growlMessages;
          $scope.inlineMessage = $scope.inline || growl.inlineMessages();
          $scope.$watch('limitMessages', function (limitMessages) {
            var directive = growlMessages.directives[$scope.referenceId];
            if (!angular.isUndefined(limitMessages) && !angular.isUndefined(directive)) {
              directive.limitMessages = limitMessages;
            }
          });
          //Cancels all promises within message upon deleting message or stop deleting.
          $scope.stopTimeoutClose = function (message) {
            if (!message.clickToClose) {
              angular.forEach(message.promises, function (promise) {
                $timeout.cancel(promise);
              });
              if (message.close) {
                growlMessages.deleteMessage(message);
              } else {
                message.close = true;
              }
            }
          };
          $scope.alertClasses = function (message) {
            return {
              'alert-success': message.severity === 'success',
              'alert-error': message.severity === 'error',
              'alert-danger': message.severity === 'error',
              'alert-info': message.severity === 'info' || message.severity === 'update-broadcast',
              'alert-warning': message.severity === 'warning',
              'icon': message.disableIcons === false,
              'alert-dismissable': !message.disableCloseButton,
              'update-broadcast': message.severity === 'update-broadcast'
            };
          };
          $scope.showCountDown = function (message) {
            return !message.disableCountDown && message.ttl > 0;
          };
          $scope.wrapperClasses = function () {
            var classes = {};
            classes['growl-fixed'] = !$scope.inlineMessage;
            classes[growl.position()] = true;
            return classes;
          };
          $scope.computeTitle = function (message) {
            var ret = {
                'success': 'Success',
                'error': 'Error',
                'info': 'Information',
                'warn': 'Warning'
              };
            return ret[message.severity];
          };
        }
      ]
    };
  }]);
angular.module('angular-growl').run([
  '$templateCache',
  function ($templateCache) {
    'use strict';
    if ($templateCache.get('templates/growl/growl.html') === undefined) {
      $templateCache.put('templates/growl/growl.html', '<div class="growl-container" ng-class="wrapperClasses()">' + '<div class="growl-item alert" ng-repeat="message in growlMessages.directives[referenceId].messages" ng-class="alertClasses(message)" ng-click="stopTimeoutClose(message)">' + '<button type="button" class="close" data-dismiss="alert" aria-hidden="true" ng-click="growlMessages.deleteMessage(message)" ng-show="!message.disableCloseButton">&times;</button>' + '<button type="button" class="close" aria-hidden="true" ng-show="showCountDown(message)">{{message.countdown}}</button>' + '<h4 class="growl-title" ng-show="message.title" ng-bind="message.title"></h4>' + '<div class="growl-message" ng-bind-html="message.text"></div>' + '</div>' + '</div>');
    }
  }
]);
angular.module('angular-growl').provider('growl', function () {
  'use strict';
  var _ttl = {
      success: null,
      error: null,
      warning: null,
      info: null
    }, _messagesKey = 'messages', _messageTextKey = 'text', _messageTitleKey = 'title', _messageSeverityKey = 'severity', _onlyUniqueMessages = true, _messageVariableKey = 'variables', _referenceId = 0, _inline = false, _position = 'top-right', _disableCloseButton = false, _disableIcons = false, _reverseOrder = false, _disableCountDown = false;
  /**
   * set a global timeout (time to live) after which messages will be automatically closed
   *
   * @param ttl in seconds
   */
  this.globalTimeToLive = function (ttl) {
    if (typeof ttl === 'object') {
      for (var k in ttl) {
        if (ttl.hasOwnProperty(k)) {
          _ttl[k] = ttl[k];
        }
      }
    } else {
      for (var severity in _ttl) {
        if (_ttl.hasOwnProperty(severity)) {
          _ttl[severity] = ttl;
        }
      }
    }
  };
  /**
   * set whether the close button should be displayed (default) or hidden
   *
   * @param {bool} disableCloseButton true to hide close button on all messages
   */
  this.globalDisableCloseButton = function (disableCloseButton) {
    _disableCloseButton = disableCloseButton;
  };
  /**
   * set whether the icons will be shown in the message
   *
   * @param {bool} messageIcons
   */
  this.globalDisableIcons = function (disableIcons) {
    _disableIcons = disableIcons;
  };
  /**
   * set whether message ordering is reversed
   *
   * @param {bool} reverseOrder
   */
  this.globalReversedOrder = function (reverseOrder) {
    _reverseOrder = reverseOrder;
  };
  /**
   * set whether to show the count down
   *
   * @param {bool} reverseOrder
   */
  this.globalDisableCountDown = function (countDown) {
    _disableCountDown = countDown;
  };
  /**
   * set the key in server sent messages the serverMessagesInterecptor is looking for variables to inject in the message
   *
   * @param  {string} messageVariableKey default: variables
   */
  this.messageVariableKey = function (messageVariableKey) {
    _messageVariableKey = messageVariableKey;
  };
  /**
   * set wheter the notficiation is displayed inline our in growl like fasion
   *
   * @param {bool} inline true to show only inline notifications
   */
  this.globalInlineMessages = function (inline) {
    _inline = inline;
  };
  /**
   * set position
   *
   * @param  {string} messageVariableKey default: top-right
   */
  this.globalPosition = function (position) {
    _position = position;
  };
  /**
   * sets the key in $http response the serverMessagesInterecptor is looking for server-sent messages, value of key
   * needs to be an array of objects
   *
   * @param {string} messagesKey default: messages
   */
  this.messagesKey = function (messagesKey) {
    _messagesKey = messagesKey;
  };
  /**
   * sets the key in server sent messages the serverMessagesInterecptor is looking for text of message
   *
   * @param {string} messageTextKey default: text
   */
  this.messageTextKey = function (messageTextKey) {
    _messageTextKey = messageTextKey;
  };
  /**
   * sets the key in server sent messages the serverMessagesInterecptor is looking for title of message
   *
   * @param {string} messageTextKey default: text
   */
  this.messageTitleKey = function (messageTitleKey) {
    _messageTitleKey = messageTitleKey;
  };
  /**
   * sets the key in server sent messages the serverMessagesInterecptor is looking for severity of message
   *
   * @param {string} messageSeverityKey default: severity
   */
  this.messageSeverityKey = function (messageSeverityKey) {
    _messageSeverityKey = messageSeverityKey;
  };
  this.onlyUniqueMessages = function (onlyUniqueMessages) {
    _onlyUniqueMessages = onlyUniqueMessages;
  };
  /**
   * $http interceptor that can be added to array of $http interceptors during config phase of application
   * via $httpProvider.responseInterceptors.push(...)
   *
   */
  this.serverMessagesInterceptor = [
    '$q',
    'growl',
    function ($q, growl) {
      function checkResponse(response) {
        if (response != undefined && response.data[_messagesKey] && response.data[_messagesKey].length > 0) {
          growl.addServerMessages(response.data[_messagesKey]);
        }
      }
      return {
        'response': function (response) {
          checkResponse(response);
          return response;
        },
        'responseError': function (rejection) {
          checkResponse(rejection);
          return $q.reject(rejection);
        }
      };
    }
  ];
  this.$get = [
    '$rootScope',
    '$interpolate',
    '$sce',
    '$filter',
    '$timeout',
    'growlMessages',
    function ($rootScope, $interpolate, $sce, $filter, $timeout, growlMessages) {
      var translate;
      growlMessages.onlyUnique = _onlyUniqueMessages;
      growlMessages.reverseOrder = _reverseOrder;
      try {
        translate = $filter('translate');
      } catch (e) {
      }
      function broadcastMessage(message) {
        if (translate) {
          message.text = translate(message.text, message.variables);
        } else {
          var polation = $interpolate(message.text);
          message.text = polation(message.variables);
        }
        var addedMessage = growlMessages.addMessage(message);
        $rootScope.$broadcast('growlMessage', message);
        $timeout(function () {
        }, 0);
        return addedMessage;
      }
      function sendMessage(text, config, severity) {
        var _config = config || {}, message;
        message = {
          text: text,
          title: _config.title,
          severity: severity,
          ttl: _config.ttl || _ttl[severity],
          variables: _config.variables || {},
          disableCloseButton: _config.disableCloseButton === undefined ? _disableCloseButton : _config.disableCloseButton,
          disableIcons: _config.disableIcons === undefined ? _disableIcons : _config.disableIcons,
          disableCountDown: _config.disableCountDown === undefined ? _disableCountDown : _config.disableCountDown,
          position: _config.position || _position,
          referenceId: _config.referenceId || _referenceId,
          destroy: function () {
            growlMessages.deleteMessage(message);
          },
          setText: function (newText) {
            message.text = $sce.trustAsHtml(String(newText));
          },
          onclose: _config.onclose,
          onopen: _config.onopen
        };
        return broadcastMessage(message);
      }
      /**
     * add one warning message with bootstrap class: alert
     *
     * @param {string} text
     * @param {{ttl: number}} config
     */
      function warning(text, config) {
        return sendMessage(text, config, 'warning');
      }
      /**
     * add one error message with bootstrap classes: alert, alert-error
     *
     * @param {string} text
     * @param {{ttl: number}} config
     */
      function error(text, config) {
        return sendMessage(text, config, 'error');
      }
      /**
     * add one info message with bootstrap classes: alert, alert-info
     *
     * @param {string} text
     * @param {{ttl: number}} config
     */
      function info(text, config) {
        return sendMessage(text, config, 'info');
      }
      /**
     * add one success message with bootstrap classes: alert, alert-success
     *
     * @param {string} text
     * @param {{ttl: number}} config
     */
      function success(text, config) {
        return sendMessage(text, config, 'success');
      }
      /**
     * add one message with specified severity
     *
     * @param {string} text
     * @param {{ttl: number}} config
     * @param {string} severity
     */
      function general(text, config, severity) {
        severity = (severity || 'error').toLowerCase();
        sendMessage(text, config, severity);
      }
      /**
     * add a indefinite number of messages that a backend server may have sent as a validation result
     *
     * @param {Array.<object>} messages
     */
      function addServerMessages(messages) {
        if (!messages || !messages.length) {
          return;
        }
        var i, message, severity, length;
        length = messages.length;
        for (i = 0; i < length; i++) {
          message = messages[i];
          if (message[_messageTextKey]) {
            severity = (message[_messageSeverityKey] || 'error').toLowerCase();
            var config = {};
            config.variables = message[_messageVariableKey] || {};
            config.title = message[_messageTitleKey];
            sendMessage(message[_messageTextKey], config, severity);
          }
        }
      }
      function onlyUnique() {
        return _onlyUniqueMessages;
      }
      function reverseOrder() {
        return _reverseOrder;
      }
      function inlineMessages() {
        return _inline;
      }
      function position() {
        return _position;
      }
      return {
        warning: warning,
        error: error,
        info: info,
        success: success,
        general: general,
        addServerMessages: addServerMessages,
        onlyUnique: onlyUnique,
        reverseOrder: reverseOrder,
        inlineMessages: inlineMessages,
        position: position
      };
    }
  ];
});
angular.module('angular-growl').service('growlMessages', [
  '$sce',
  '$timeout',
  function ($sce, $timeout) {
    'use strict';
    this.directives = {};
    this.initDirective = function (referenceId, limitMessages) {
      this.directives[referenceId] = {
        messages: [],
        limitMessages: limitMessages
      };
    };
    this.addMessage = function (message) {
      var directive = this.directives[message.referenceId];
      var messages = directive.messages;
      var found;
      var msgText;
      if (this.onlyUnique) {
        angular.forEach(messages, function (msg) {
          msgText = $sce.getTrustedHtml(msg.text);
          if (message.text === msgText && message.severity === msg.severity && msg.title === msg.title) {
            found = true;
          }
        });
        if (found) {
          return;
        }
      }
      message.text = $sce.trustAsHtml(String(message.text));
      /**If message closes on timeout, add's promises array for
      timeouts to stop close. Also sets message.closeoutTimer to ttl / 1000
    **/
      if (message.ttl && message.ttl !== -1) {
        message.countdown = message.ttl / 1000;
        message.promises = [];
        message.close = false;
        message.countdownFunction = function () {
          if (message.countdown > 1) {
            message.countdown--;
            message.promises.push($timeout(message.countdownFunction, 1000));
          } else {
            message.countdown--;
          }
        };
      }
      /** Limit the amount of messages in the container **/
      if (angular.isDefined(directive.limitMessages)) {
        var diff = messages.length - (directive.limitMessages - 1);
        if (diff > 0) {
          messages.splice(directive.limitMessages - 1, diff);
        }
      }
      /** abillity to reverse order (newest first ) **/
      if (this.reverseOrder) {
        messages.unshift(message);
      } else {
        messages.push(message);
      }
      if (typeof message.onopen === 'function') {
        message.onopen();
      }
      if (message.ttl && message.ttl !== -1) {
        //adds message timeout to promises and starts messages countdown function.
        message.promises.push($timeout(angular.bind(this, function () {
          this.deleteMessage(message);
        }), message.ttl));
        message.promises.push($timeout(message.countdownFunction, 1000));
      }
      return message;
    };
    this.deleteMessage = function (message) {
      var messages = this.directives[message.referenceId].messages;
      var index = messages.indexOf(message);
      if (index > -1) {
        messages[index].close = true;
        messages.splice(index, 1);
      }
      if (typeof message.onclose === 'function') {
        message.onclose();
      }
    };
  }
]);