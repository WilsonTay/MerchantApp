/**
 * Created by Admin on 9/5/2015.
 */
var merchantApp = angular.module('MerchantApp', ['ngCookies', 'ngMaterial', 'ui.router'])
    .run(function ($rootScope, $location, $http, $cookies, $state) {

        $rootScope.$on('$stateChangeStart', function (event, toState) {
            console.log(toState);
            console.log($rootScope.getMerchantInfo());
            if ((toState.name !== 'login') && ($rootScope.getMerchantInfo() == null)) {
                event.preventDefault();
                $state.go('login');
            }
            else if ((toState.name == 'login') && ($rootScope.getMerchantInfo() != null)) {
                event.preventDefault();
                $state.go('main.dashboard');
            }
        });

        $rootScope.getMerchantInfo = function () {
            //return $cookies.getObject('merchantInfo');
            return JSON.parse(window.localStorage.getItem("merchantInfo"));
        };

        $rootScope.setMerchantInfo = function (info) {
            //$cookies.putObject('merchantInfo', info);
            window.localStorage.setItem("merchantInfo", JSON.stringify(info));
        };

        $rootScope.getToken = function () {
            //return $cookies.get('token');
            var token = window.localStorage.getItem("token");
            console.log("GET TOKEN "+ token);
            return token;
        };

        $rootScope.setToken = function (token) {
            //$cookies.put('token', token);
            window.localStorage.setItem("token", token);
            console.log("SET TOKEN "+ token);
        };

        $rootScope.baseUrl = "http://alwayscp.servehttp.com/DealsWhat.Application.WebApi/";
        $rootScope.lastScannedOrderline = {};

        var price = 5.0;

        $rootScope.lastScannedOrderline.DealThumbnailUrl = 'http://192.168.0.2/DealsWhat/Images/dealimages/16.jpg';
        $rootScope.lastScannedOrderline.DealOption = 'Option 0';
        $rootScope.lastScannedOrderline.SpecialPrice = 'RM ' + price.toFixed(2);
        $rootScope.lastScannedOrderline.DealAttributes = [];
        $rootScope.lastScannedOrderline.DealAttributes.push('S');
        $rootScope.lastScannedOrderline.DealAttributes.push('Black');

        $rootScope.scanCoupon = function () {

            cordova.plugins.barcodeScanner.scan(
                function (result) {
                    var text = result.text;
                    var data = {};
                    data.Value = text;
                    //data.Value = "04d51f20-26cf-4f6f-b31d-a048e23e783a";
                    $http.post($rootScope.baseUrl + "api/merchant/redeem/", data)
                        .success(function (response, status) {
                            $rootScope.lastScannedOrderline = response;
                            $location.path("/redeemComplete/" + status);
                        })
                        .error(function (response, status) {
                            $location.path("/redeemComplete/" + status);
                        });
                },
                function (error) {
                    alert("Scanning failed: " + error);
                }
            );


        }

    });

merchantApp.directive('loading', ['$http', function ($http) {
    return {
        restrict: 'A',
        link: function (scope, elm, attrs) {
            scope.isLoading = function () {
                return $http.pendingRequests.length > 0;
            };

            scope.$watch(scope.isLoading, function (v) {
                if (v) {
                    $(elm).removeClass('loaded');
                } else {
                    $(elm).addClass('loaded');
                }
            });
        }
    };

}]);

merchantApp.config(
    function ($mdThemingProvider, $stateProvider, $urlRouterProvider) {
        $mdThemingProvider.theme('altTheme')
            .primaryPalette('purple');

        $urlRouterProvider.otherwise('/dashboard');

        $stateProvider
            .state('login', {
                url: "/",
                templateUrl: 'login.html',
                controller: 'loginController'
            })
            .state('login1', {
                url: "/login",
                templateUrl: 'login.html',
                controller: 'loginController'
            })
            .state('main', {
                url: "/main",
                templateUrl: 'main.html',
                controller: 'mainController'
            })
            .state('main.dashboard', {
                url: "^/dashboard",
                templateUrl: 'dashboard.html',
                controller: 'dashboardController'
            })
            .state('main.deals', {
                url: "^/deals",
                templateUrl: 'deals.html',
                controller: 'dealsController'
            })
            .state('main.order', {
                url: "^/order/:orderLineId",
                templateUrl: 'specificOrder.html',
                controller: 'singleOrderController'
            })
            .state('main.ordersdeal', {
                url: "^/orders/:dealId",
                templateUrl: 'orders.html',
                controller: 'ordersController'
            })
            .state('main.orders', {
                url: "^/orders",
                templateUrl: 'orders.html',
                controller: 'ordersController'
            })
            .state('main.redeemComplete', {
                url: "^/redeemComplete/:statusCode",
                templateUrl: 'redeemComplete.html',
                controller: 'redeemCompleteController'
            });

    });


merchantApp.controller('redeemCompleteController', function ($scope, $stateParams, $state, $rootScope) {

    var statusCode = $stateParams.statusCode;

    console.log('redeem status code:' + statusCode);

    $scope.redeemSuccess = statusCode == 200;

    if (statusCode == 404) {
        $scope.errorMessage = "The coupon code is invalid.";
    } else if (statusCode == 400) {
        $scope.errorMessage = "The coupon has already been redeemed."
    }

    $scope.goToDashboard = function () {
        $state.go('main.dashboard');
    };
});

merchantApp.controller('loginController', function ($scope, $http, $rootScope, $state) {

    $('body').removeClass('white');
    $('body').addClass('cyan');

    $scope.username = 'test@test.com';
    $scope.password = 'Password1!';

    $scope.performLogin = function () {

        console.log('is valid ' + $scope.loginForm.$valid);
        if ($scope.loginForm.$valid) {
            console.log('is valid executed');

            var login = {};
            login.username = $scope.username;
            login.password = $scope.password;
            login.grant_type = 'password';

            $http({
                method: 'POST',
                url: $rootScope.baseUrl + "token",
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                transformRequest: function (obj) {
                    var str = [];
                    for (var p in obj)
                        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                    return str.join("&");
                },
                data: login
            }).success(function (response) {
                var token = response.access_token;
                console.log(response);
                $rootScope.setToken(token);

                if (token != '') {
                    performAuthorizedGet($rootScope.baseUrl + "api/merchant/info")
                        .success(function (response) {
                            $rootScope.setMerchantInfo(response);
                            $state.go('main.dashboard');
                        });
                }
            });
        }
    }
});


merchantApp.controller('singleOrderController', function ($scope, $http, $timeout, $stateParams, $rootScope) {
    var merchantId = $rootScope.getMerchantInfo().Id;
    var orderLineId = $stateParams.orderLineId;

    $http.get($rootScope.baseUrl + "api/merchant/orderlines?merchantId=" + merchantId)
        .success(function (response) {
            var order = response.filter(function (singleOrderLine) {
                return singleOrderLine.Id == orderLineId;
            })[0];

            $scope.order = order;
            $scope.order.DatePlaced = moment($scope.order.DatePlaced).format('MMMM Do YYYY, h:mm:ss a');
            $scope.totalCoupons = order.Coupons.length;
            $scope.redeemedCoupons = order.Coupons.filter(function (coupon) {
                return $(coupon.Status == 1);
            }).length;
        });

});

function getMatchingItemCount(items, getDateFunction, daysBeforeToday) {
    return items.filter(function () {
        var item = $(this);
        var itemDate = getDateFunction(item);

        if (itemDate == null) {
            return false;
        }

        var date = moment(itemDate, "YYYY-MM-DD");
        var now = moment();

        var match = date.date() == (now.date() - daysBeforeToday) &&
            date.month() == (now.month()) &&
            date.year() == (now.year());

        return match;
    }).length;
}

function performAuthorizedGet(endpoint) {

    var injector = angular.element('html').injector();
    var $http = injector.get('$http');
    var $rootScope = injector.get('$rootScope');
    var token = $rootScope.getToken();

    return $http.get(endpoint,
        {
            headers: {'Authorization': 'Bearer ' + token}
        });
}

merchantApp.controller('dashboardController', function ($scope, $http, $timeout, $rootScope) {
    $('body').removeClass('cyan');
    $('body').addClass('white');

    $scope.dealCount = 0;
    $scope.merchant = $rootScope.getMerchantInfo();

    $http.get($rootScope.baseUrl + "api/deals?merchantId=" + $rootScope.getMerchantInfo().Id)
        .success(function (response) {
            $scope.dealCount = response.length;
        });

    $http.get($rootScope.baseUrl + "api/merchant/orderlines?merchantId=" + $rootScope.getMerchantInfo().Id)
        .success(function (response) {
            $scope.orders = response;

            var getOrderDatesCallback = function (order) {
                return order[0].DatePlaced;
            };

            var getCouponRedemptionCallback = function (coupon) {
                return coupon[0].DateRedeemed;
            };

            var deals = $(response).map(
                function () {
                    return $(this)[0];
                }
            );

            $scope.todayOrderCount = getMatchingItemCount(deals, getOrderDatesCallback, 1);
            $scope.yesterdayOrderCount = getMatchingItemCount(deals, getOrderDatesCallback, 2);

            var coupons = $(response).map(
                function () {
                    return $(this)[0].Coupons;
                });

            $scope.todayRedemptionCount = getMatchingItemCount(coupons, getCouponRedemptionCallback, 1);
            $scope.yesterdayRedemptionCount = getMatchingItemCount(coupons, getCouponRedemptionCallback, 2);

            var headers = [];
            var values = [];

            for (i = 30; i > 0; i--) {
                var now = moment();
                var day = now.subtract(i, 'days');
                headers.push(day.format("DD-MM"));
                values.push(getMatchingItemCount(deals, getOrderDatesCallback, i));
            }

            var chartData = getChartData(headers, values);

            $timeout(function () {
                initializeChart(chartData);
            }, 500);
        });
});

merchantApp.controller('ordersController', function ($scope, $http, $timeout, $rootScope, $stateParams, $location) {
    var dealId = $stateParams.dealId;
    var params = "";

    if (dealId != null) {
        params = "&dealId=" + dealId;
    }

    $scope.goToOrder = function (orderId) {
        $location.path("/order/" + orderId);
    };

    $http.get($rootScope.baseUrl + "api/merchant/orderlines?merchantId=" + $rootScope.getMerchantInfo().Id + params)
        .success(function (response) {
            $scope.orders = response;

            angular.forEach($scope.orders, function (order, index) {
                order.DatePlaced = moment(order.DatePlaced).format('MMMM Do YYYY, h:mm:ss a');
            });
        });
});

merchantApp.controller('dealsController', function ($scope, $http, $timeout, $rootScope) {
    $http.get($rootScope.baseUrl + "api/deals?merchantId=" + $rootScope.getMerchantInfo().Id)
        .success(function (response) {
            $scope.deals = response;

            angular.forEach($scope.deals, function (deal, index) {
                deal.orderLink = "#/orders/" + deal.Id;
                deal.SpecialPrice = "RM " + deal.SpecialPrice.toFixed(2);
                deal.EndTime = 'Ends at ' + moment(deal.EndTime).format('DD-MM-YYYY');
            })
        });
});

merchantApp.controller('mainController', function ($rootScope, $scope, $cookies, $state) {

    $scope.logout = function () {
        $rootScope.setMerchantInfo(null);
        $rootScope.setToken(null);

        $state.go('login');
    };

    setTimeout(function () {
        $('.sidebar-collapse').sideNav({
            edge: 'left', // Choose the horizontal origin
        });
    }, 500);
    /*  $scope.toggleSidenav = function (menuId) {
     $mdSidenav(menuId).toggle();
     };

     $scope.scanCoupon = function () {
     var data = {};
     data.Value = "b71bcaa6-646d-42ed-9fb5-8fe38649cebc";
     $http.post($rootScope.baseUrl + "api/merchant/redeem/", data)
     .success(function (response) {
     $location.path("/redeemComplete/hello/1");
     });*/


    /*  cordova.plugins.barcodeScanner.scan(
     function (result) {
     alert("We got a barcode\n" +
     "Result: " + result.text + "\n" +
     "Format: " + result.format + "\n" +
     "Cancelled: " + result.cancelled);
     },
     function (error) {
     alert("Scanning failed: " + error);
     }
     );*/
});


function getChartData(headers, values) {
    var data = {
        labels: headers,
        datasets: [
            {
                label: "First dataset",
                fillColor: "rgba(128, 222, 234, 0.6)",
                strokeColor: "#ffffff",
                pointColor: "#00bcd4",
                pointStrokeColor: "#ffffff",
                pointHighlightFill: "#ffffff",
                pointHighlightStroke: "#ffffff",
                data: values
            }
        ]
    };

    return data;
}

function initializeChart(data) {
    var trendingLineChart = document.getElementById("trending-line-chart").getContext("2d");
    window.trendingLineChart = new Chart(trendingLineChart).Line(data, {
        /* scaleShowGridLines: true,///Boolean - Whether grid lines are shown across the chart
         scaleGridLineColor: "rgba(255,255,255,0.4)",//String - Colour of the grid lines
         scaleGridLineWidth: 1,//Number - Width of the grid lines
         scaleShowHorizontalLines: true,//Boolean - Whether to show horizontal lines (except X axis)
         scaleShowVerticalLines: false,//Boolean - Whether to show vertical lines (except Y axis)
         bezierCurve: true,//Boolean - Whether the line is curved between points
         bezierCurveTension: 0.4,//Number - Tension of the bezier curve between points
         pointDot: true,//Boolean - Whether to show a dot for each point
         pointDotRadius: 5,//Number - Radius of each point dot in pixels
         pointDotStrokeWidth: 2,//Number - Pixel width of point dot stroke
         pointHitDetectionRadius: 20,//Number - amount extra to add to the radius to cater for hit detection outside the drawn point
         datasetStroke: true,//Boolean - Whether to show a stroke for datasets
         datasetStrokeWidth: 3,//Number - Pixel width of dataset stroke
         datasetFill: true,//Boolean - Whether to fill the dataset with a colour
         animationSteps: 15,// Number - Number of animation steps
         animationEasing: "easeOutQuart",// String - Animation easing effect
         tooltipTitleFontFamily: "'Roboto','Helvetica Neue', 'Helvetica', 'Arial', sans-serif",// String - Tooltip title font declaration for the scale label
         scaleFontSize: 12,// Number - Scale label font size in pixels
         scaleFontStyle: "normal",// String - Scale label font weight style
         scaleFontColor: "#fff",// String - Scale label font colour
         tooltipEvents: ["mousemove", "touchstart", "touchmove"],// Array - Array of string names to attach tooltip events
         tooltipFillColor: "rgba(255,255,255,0.8)",// String - Tooltip background colour
         tooltipTitleFontFamily: "'Roboto','Helvetica Neue', 'Helvetica', 'Arial', sans-serif",// String - Tooltip title font declaration for the scale label
         tooltipFontSize: 12,// Number - Tooltip label font size in pixels
         tooltipFontColor: "#000",// String - Tooltip label font colour
         tooltipTitleFontFamily: "'Roboto','Helvetica Neue', 'Helvetica', 'Arial', sans-serif",// String - Tooltip title font declaration for the scale label
         tooltipTitleFontSize: 14,// Number - Tooltip title font size in pixels
         tooltipTitleFontStyle: "bold",// String - Tooltip title font weight style
         tooltipTitleFontColor: "#000",// String - Tooltip title font colour
         tooltipYPadding: 8,// Number - pixel width of padding around tooltip text
         tooltipXPadding: 16,// Number - pixel width of padding around tooltip text
         tooltipCaretSize: 10,// Number - Size of the caret on the tooltip
         tooltipCornerRadius: 6,// Number - Pixel radius of the tooltip border
         tooltipXOffset: 10,// Number - Pixel offset from point x to tooltip edge*/
        responsive: true
    });
}
