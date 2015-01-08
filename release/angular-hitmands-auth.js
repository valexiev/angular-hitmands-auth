/**!
 * @Project: angular-hitmands-auth
 * @Authors: Giuseppe Mandato <gius.mand.developer@gmail.com>
 * @Link: https://github.com/hitmands/angular-hitmands-auth
 * @License: MIT
 * @Date: 2015-01-08
 * @Version: 0.0.1
***/

(function(window, angular) {
   'use strict';

   /* @ngInject */
   function AuthModuleRun($rootScope, AuthService, $state, $location, $timeout) {
      function redirect() {
         $timeout(function() {
            $location.path("/");
         }, 0);
      }
      $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams) {
         if (!AuthService.authorize(toState, AuthService.getCurrentUser())) {
            var _isUserLoggedIn = AuthService.isUserLoggedIn();
            event.preventDefault();
            $rootScope.$broadcast("$stateChangeError", toState, toParams, fromState, fromParams, {
               "statusCode": _isUserLoggedIn ? 403 : 401,
               "statusText": _isUserLoggedIn ? "Forbidden" : "Unauthorized",
               "isUserLoggedIn": _isUserLoggedIn,
               "publisher": "AuthService.authorize"
            });
            fromState.name || redirect();
         }
      });
      $rootScope.$on(EVENTS.update, function(event) {
         AuthService.authorize($state.current, AuthService.getCurrentUser()) || redirect();
      });
   }
   AuthModuleRun.$inject = ['$rootScope', 'AuthService', '$state', '$location', '$timeout'];

   /* @ngInject */
   function AuthProviderFactory($httpProvider) {
      function _isUserLoggedIn() {
         return self.getLoggedUser() instanceof AuthCurrentUser;
      }
      function _getAuthToken() {
         return authToken;
      }
      /**
    * @preserve
    * @callback Requester~requestCallback - The callback that handles the response.
    */
      var _dataParser = function(data, headers, statusCode) {
         return {
            "user": data,
            "token": data.token,
            "authLevel": data.authLevel
         };
      }, self = this, currentUser = null, authToken = null;
      /**
    * Extends Used Routes
    *
    * @preserve
    * @param {Object} [newRoutes = {login: String, logout: String, fetch: String}]
    */
      this.useRoutes = function AuthServiceRoutesListSetter(newRoutes) {
         angular.isObject(newRoutes) && (routes = angular.extend(routes, newRoutes));
         return this;
      };
      /**
    * Get the CurrentUser Object or Null
    *
    * @preserve
    * @returns {Object|null}
    */
      this.getLoggedUser = function AuthServiceLoggedUserGetter() {
         return currentUser;
      };
      /**
    * Appends Authentication Token to all $httpRequests
    *
    * @preserve
    * @param {String} tokenKey - The Name of Key
    */
      this.tokenizeHttp = function AuthServiceTokenizeHttp(tokenKey) {
         (!angular.isString(tokenKey) || tokenKey.length < 1) && (tokenKey = "x-auth-token");
         $httpProvider.interceptors.push(function AuthServiceInterceptor() {
            return {
               "request": function AuthServiceRequestTransform(config) {
                  _isUserLoggedIn() && angular.isObject(config) && config.hasOwnProperty("headers") && (config.headers[tokenKey] = _getAuthToken());
                  return config;
               }
            };
         });
         return this;
      };
      /**
    * @preserve
    * @param {Object|null} [userData=null]
    * @param {Number|null} authLevel
    * @param {String|null} [authenticationToken=null]
    */
      this.setLoggedUser = function AuthServiceLoggedUserSetter(userData, authenticationToken, authLevel) {
         if (angular.isArray(userData) || !angular.isObject(userData) || !angular.isString(authenticationToken) || authenticationToken.length < 1) {
            userData = null;
            authenticationToken = null;
         }
         currentUser = userData ? new AuthCurrentUser(userData, authLevel) : null;
         authToken = authenticationToken;
         return this;
      };
      /**
    * @preserve
    * @param {Requester~requestCallback} callback - The callback that handles the $http response.
    */
      this.parseHttpAuthData = function AuthServiceExpectDataAs(callback) {
         angular.isFunction(callback) && (_dataParser = callback);
         return this;
      };
      this.$get = ['$rootScope', '$http', '$state', '$exceptionHandler', '$timeout', function($rootScope, $http, $state, $exceptionHandler, $timeout) {
         function _setLoggedUser(newUserData, newAuthToken, newAuthLevel) {
            self.setLoggedUser(newUserData, newAuthToken, newAuthLevel);
            $rootScope.$broadcast(EVENTS.update);
            $timeout(function() {
               $rootScope.$$phase || $rootScope.$digest();
            }, 0);
         }
         function _sanitizeParsedData(parsedData) {
            if (!angular.isObject(parsedData) || !angular.isObject(parsedData.user) || !angular.isString(parsedData.token) || parsedData.token.length < 1) {
               $exceptionHandler("AuthServiceProvider.parseHttpAuthData", "Invalid callback passed. The Callback must return an object like {user: Object, token: String, authLevel: Number}");
               parsedData = {
                  "user": null,
                  "token": null
               };
            }
            return parsedData;
         }
         return {
            /**
          * Performs Login Request and sets the Auth Data
          *
          * @preserve
          * @param {{username: String, password: String, rememberMe: Boolean}} credentials
          * @returns {ng.IPromise}
          */
            "login": function(credentials) {
               return $http.post(routes.login, credentials, {
                  "cache": !1
               }).then(function(result) {
                  var data = _sanitizeParsedData(_dataParser(result.data, result.headers(), result.status));
                  _setLoggedUser(data.user, data.token, data.authLevel);
                  $rootScope.$broadcast(EVENTS.login.success, result);
                  return result;
               }, function(error) {
                  _setLoggedUser(null, null, null);
                  $rootScope.$broadcast(EVENTS.login.error, error);
                  return error;
               });
            },
            /**
          * Updates the Auth Data
          *
          * @preserve
          * @returns {ng.IPromise}
          */
            "fetchLoggedUser": function() {
               return $http.get(routes.fetch, {
                  "cache": !1
               }).then(function(result) {
                  var data = _sanitizeParsedData(_dataParser(result.data, result.headers(), result.status));
                  _setLoggedUser(data.user, data.token, data.authLevel);
                  $rootScope.$broadcast(EVENTS.fetch.success, result);
                  return result;
               }, function(error) {
                  _setLoggedUser(null, null, null);
                  $rootScope.$broadcast(EVENTS.fetch.error, error);
                  return error;
               });
            },
            /**
          * Performs Logout request
          *
          * @preserve
          * @returns {ng.IPromise}
          */
            "logout": function() {
               return $http.post(routes.logout, null, {
                  "cache": !1
               }).then(function(result) {
                  _setLoggedUser(null, null, null);
                  $rootScope.$broadcast(EVENTS.logout.success, result);
                  return result;
               }, function(error) {
                  _setLoggedUser(null, null, null);
                  $rootScope.$broadcast(EVENTS.logout.error, error);
                  return error;
               });
            },
            /**
          * @preserve
          * @param {Object} user
          * @param {Number} authLevel
          * @param {String} authenticationToken
          */
            "setCurrentUser": function(user, authLevel, authenticationToken) {
               if (angular.isArray(user) || !angular.isObject(user) || !angular.isString(authenticationToken) || authenticationToken.length < 1) {
                  return !1;
               }
               _setLoggedUser(user, authenticationToken, authLevel);
               return !0;
            },
            /**
          * @preserve
          */
            "unsetCurrentUser": function() {
               _setLoggedUser(null, null, null);
               return !0;
            },
            /**
          * @preserve
          * @returns {Object|Null} - Current User Data
          */
            "getCurrentUser": function() {
               return self.getLoggedUser();
            },
            /**
          * @preserve
          * Checks if the user is logged in
          * @returns {Boolean}
          */
            "isUserLoggedIn": function() {
               return _isUserLoggedIn();
            },
            /**
          * @preserve
          * @param {Object} state
          * @param {Object} [user = currentUser]
          * @returns {Boolean} Is the CurrentUser Authorized for State?
          */
            "authorize": function(state, user) {
               var propertyToCheck = AuthCurrentUser.getAuthProperty();
               if (!angular.isObject(state) || Object.getPrototypeOf($state) !== Object.getPrototypeOf(state)) {
                  $exceptionHandler("AuthService.authorize", "first params must be ui-router $state");
                  return !1;
               }
               var stateAuthLevel = angular.isObject(state.data) && state.data.hasOwnProperty(propertyToCheck) ? state.data[propertyToCheck] : state[propertyToCheck];
               return !angular.isNumber(stateAuthLevel) || 1 > stateAuthLevel ? !0 : angular.isObject(user) ? (user[propertyToCheck] || 0) >= stateAuthLevel : _isUserLoggedIn() ? (self.getLoggedUser()[propertyToCheck] || 0) >= stateAuthLevel : !1;
            },
            /**
          * @preserve
          * @returns {String|Null} - The Authentication Token
          */
            "getAuthenticationToken": function() {
               return _getAuthToken();
            }
         };
      }];
   }
   AuthProviderFactory.$inject = ['$httpProvider'];

   /* @ngInject */
   function AuthLoginDirectiveFactory(AuthService) {
      return {
         "restrict": "A",
         "link": function(iScope, iElement, iAttributes) {
            var credentials = iScope[iAttributes.authLogin], _form = null;
            try {
               _form = iScope[iElement.attr("name")];
            } catch (error) {}
            iElement.bind("submit", function(event) {
               angular.isObject(credentials) ? angular.isObject(_form) && _form.hasOwnProperty("$invalid") && _form.$invalid ? event.preventDefault() : AuthService.login(credentials) : event.preventDefault();
            });
         }
      };
   }
   AuthLoginDirectiveFactory.$inject = ['AuthService'];

   /* @ngInject */
   function AuthLogoutDirectiveFactory(AuthService) {
      return function(scope, element, attrs) {
         element.bind("click", function() {
            AuthService.logout();
         });
      };
   }
   AuthLogoutDirectiveFactory.$inject = ['AuthService'];

   /* @ngInject */
   function AuthClassesDirectiveFactory(AuthService) {
      var classes = {
         "loggedIn": "user-is-logged-in",
         "notLoggedIn": "user-not-logged-in"
      };
      return {
         "restrict": "A",
         "scope": !1,
         "link": function(iScope, iElement, iAttributes) {
            function _toggleClass() {
               if (AuthService.isUserLoggedIn()) {
                  iAttributes.$removeClass(classes.notLoggedIn);
                  iAttributes.$addClass(classes.loggedIn);
               } else {
                  iAttributes.$removeClass(classes.loggedIn);
                  iAttributes.$addClass(classes.notLoggedIn);
               }
            }
            _toggleClass();
            iScope.$on(EVENTS.update, function() {
               _toggleClass();
            });
         }
      };
   }
   AuthClassesDirectiveFactory.$inject = ['AuthService'];

   var routes = {
      "login": "/users/login",
      "logout": "/users/logout",
      "fetch": "/users/me"
   }, EVENTS = {
      "login": {
         "success": "hitmands.auth:login.resolved",
         "error": "hitmands.auth:login.rejected"
      },
      "logout": {
         "success": "hitmands.auth:logout.resolved",
         "error": "hitmands.auth:logout.rejected"
      },
      "fetch": {
         "success": "hitmands.auth:fetch.resolved",
         "error": "hitmands.auth:fetch.rejected"
      },
      "update": "hitmands.auth:update"
   }, AuthCurrentUser = function() {
      function AuthCurrentUser(userData, authLevel) {
         /* jshint ignore:start */
         for (var k in userData) {
            userData.hasOwnProperty(k) && k !== authProperty && Object.defineProperty(this, k, {
               "value": userData[k],
               "configurable": !0,
               "enumerable": !0,
               "writable": !0
            });
         }
         /* jshint ignore:end */
         authLevel = authLevel || userData[authProperty] || 0;
         Object.defineProperty(this, authProperty, {
            "value": authLevel,
            "configurable": !1,
            "enumerable": !0,
            "writable": !1
         });
      }
      var authProperty = "authLevel";
      AuthCurrentUser.getAuthProperty = function() {
         return authProperty;
      };
      return AuthCurrentUser;
   }.call(this);

   angular.module("hitmands.auth", [ "ui.router" ]).provider("AuthService", AuthProviderFactory).directive("authLogin", AuthLoginDirectiveFactory).directive("authLogout", AuthLogoutDirectiveFactory).directive("authClasses", AuthClassesDirectiveFactory).run(AuthModuleRun);
//# sourceMappingURL=angular-hitmands-auth.js.map

})(window, angular);