describe('Angular Module Hitmands-Auth:AuthService', function() {
   'use strict';
   var $httpBackend, $rootScope, httpLoginHandler, httpLogoutHandler, $controller, AuthServiceProvider, getController;

   // Authentication Test Cases
   var Mocks = {
      validCredentials: {
         username: 'hitmands',
         password: 'asdasd'
      },
      invalidCredentials: {
         username: '',
         password: ''
      },
      user: {
         username: 'Hitmands',
         id: 1,
         slug: 'giuseppe-mandato',
         name: 'Giuseppe',
         surname: 'Mandato',
         authLevel: 1000,
         token: '697b84c9c82f9abc6a80359c9125d293'
      }
   };

   // Arrange (Set Up Scenario)
   beforeEach(function() {
      angular.mock.module( 'ui.router', 'hitmands.auth', function( _AuthServiceProvider_ ) {
         AuthServiceProvider = _AuthServiceProvider_;
         AuthServiceProvider.parseHttpAuthData(function(data) {
            return {
               user: data,
               authLevel: data.authLevel,
               token: data.token
            };
         });
         AuthServiceProvider.tokenizeHttp();
      });
   });

   beforeEach(angular.mock.inject(
      function( _$rootScope_, _$controller_, _$httpBackend_) {

         $httpBackend = _$httpBackend_;
         $controller = _$controller_;
         $rootScope = _$rootScope_;

         httpLoginHandler = $httpBackend
            .whenPOST('/users/login')
            .respond(function( method, url, data, headers ) {
               data = angular.fromJson(data);

               var resolve = [200, Mocks.user, { 'X-AUTH-TOKEN' : Mocks.user.token }];
               var reject = [401, null];
               var isValid  = angular.equals(data, Mocks.validCredentials );

               return isValid ? resolve : reject;
            });

         httpLogoutHandler = $httpBackend
            .whenPOST('/users/logout')
            .respond([200, null]);

      }
   ));



   it('Should Resolve Login Request', angular.mock.inject(
      function(AuthService) {

         expect(AuthService.isUserLoggedIn()).toBeFalsy();
         expect(AuthService.getCurrentUser()).toBeNull();
         expect(AuthService.getAuthenticationToken()).toBeNull();

         $httpBackend.expectPOST('/users/login');
         AuthService.login(Mocks.validCredentials);
         $httpBackend.flush();

         expect(AuthService.isUserLoggedIn()).toBeTruthy();
         expect(AuthService.getCurrentUser()).toEqual(Mocks.user);
         expect(AuthService.getAuthenticationToken()).toEqual(Mocks.user.token);
         AuthService.unsetCurrentUser()
      }
   ));

   it('Should Not Resolve Login Request', angular.mock.inject(
      function(AuthService) {

         expect(AuthService.isUserLoggedIn()).toBeFalsy();
         expect(AuthService.getCurrentUser()).toBeNull();
         expect(AuthService.getAuthenticationToken()).toBeNull();

         $httpBackend.expectPOST('/users/login');
         AuthService.login(Mocks.inValidCredentials);
         $httpBackend.flush();

         expect(AuthService.isUserLoggedIn()).toBeFalsy();
         expect(AuthService.getCurrentUser()).toBeNull();
         expect(AuthService.getAuthenticationToken()).toBeNull();
      }
   ));



   afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
   });

});