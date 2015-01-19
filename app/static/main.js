( function ( $, L, NProgress, Rlite, ga, randomColor ) {
    var router, map, currentRequest, currentControllers = [];

    function showMain () {
        $( '#overlay' ).show();
        $( '#processing' ).hide();
        $( '#main' ).fadeIn();
        $( '#titleBar' ).fadeOut();

        map.setView( [15,0], 2 );
    }

    function getPoints ( title, baseUrl ) {
        var deferred = $.Deferred();

        currentRequest = $.post( LOCATIONS_ENDPOINT, {
            title: title,
            base_url: baseUrl
        } ).done( function ( data ) {
            console.log( 'Data received. Time elapsed: ' + data.elapsed + 's' );
            if ( data && data.success === true ) {
                deferred.resolve( data.locations );
            } else {
                deferred.reject( data ? data.message : 'An unknown error occurred: ' + JSON.stringify( data ) );
            }
        } );

        return deferred;
    }

    function addLocationsLayer( title, baseUrl, color ) {
        var deferred = $.Deferred();

        getPoints( title, baseUrl )
            .fail( function ( message ) {
                deferred.reject( message );
            } )
            .done( function ( points ) {
                var controller,
                    $title = $( '<span>' ),
                    latlngs = points.map( function ( pt ) {
                        return new L.LatLng( pt[0], pt[1] );
                    } ),
                    maxLl = 1,
                    llCounts = {},
                    uniqueLatLngs = latlngs.filter( function ( ll ) {
                        if ( llCounts.hasOwnProperty( ll.toString() ) ) {
                            llCounts[ll.toString()]++;
                            maxLl = Math.max( maxLl, llCounts[ll.toString()] );
                            return false;
                        } else {
                            llCounts[ll.toString()] = 1;
                            return true;
                        }
                    } ),
                    scale = function ( x ) {
                        return Math.exp( Math.log( 10 ) / ( Math.max( maxLl, 150 ) - 1 ) * ( x - 1 ) );
                    },
                    pointMapLayer = L.heatLayer( uniqueLatLngs, {
                        minOpacity: 1,
                        maxZoom: 1,
                        radius: function ( data ) {
                            return scale( llCounts[data[3].toString()] );
                        },
                        blur: 0.001,
                        gradient: { 0: 'black', 0.001: color }
                    } );

                function Controller ( map, $title ) {
                    this.isHidden = true;

                    this.toggle = function () {
                        if ( this.isHidden ) {
                            this.show();
                            $title.css( 'opacity', '1' );
                        } else {
                            this.hide();
                            $title.css( 'opacity', '0.4' );
                        }
                    }

                    this.destroy = function () {
                        map.removeLayer( pointMapLayer );
                        $title.remove();
                    };

                    this.hide = function () {
                        this.isHidden = true;
                        map.removeLayer( pointMapLayer );
                    };

                    this.show = function () {
                        this.isHidden = false;
                        map.addLayer( pointMapLayer );
                    };
                }

                controller = new Controller( map, $title );

                $title
                    .css( 'color', color )
                    .text( title )
                    .click( function () {
                        controller.toggle();
                    } )
                    .appendTo( '#titles' );

                NProgress.inc();

                deferred.resolve( controller );
            } );

        return deferred;     
    }

    function showLocationsLayers ( titles, baseUrl ) {
        var start = Date.now(),
            workingInterval = setInterval( function () {
                $( '#elapsed' ).text( ( ( Date.now() - start ) / 1000 ).toFixed( 2 ) );
            }, 5 ),
            usedColors = [];

        NProgress.start();

        $( '#overlay' ).show();
        $( '#titleBar' ).fadeOut();
        $( '#main' ).hide();
        $( '#processing' ).show();
        $( '#message' ).text( 'Generating map of contributor locations' );

        $.when.apply( $, titles.map( function ( t, index ) {
            var color = randomColor();
            while ( usedColors.indexOf( color ) !== -1 ) {
                color = randomColor();
            }
            usedColors.push( color );
            return addLocationsLayer( t, baseUrl, color );
        } ) ).fail( function ( e ) {
            $( '#message' ).text( e );
        } ).done( function () {
            currentControllers = currentControllers.concat( Array.prototype.slice.call( arguments ) );
            showMap();
        } ).always( function () {
            clearInterval( workingInterval );        
            NProgress.done();
        } );

        function showMap () {
            $( '#overlay' ).fadeOut();
            $( '#titleBar' ).slideDown();
            currentControllers.forEach( function ( controller ) {
                controller.show();
            } );

            if ( !window.localStorage || !window.localStorage['hasShownTooltip'] ) {
                setTimeout( function () {
                    $( '#titles' ).tooltipster( 'show' );
                    if ( window.localStorage ) {
                        window.localStorage['hasShownTooltip'] = 'true';
                    } 
                }, 1500 );
            }
        }
    }

    function setUpMap () {
        map = L.map( 'map' ).setView( [15,0], 2 );
        L.tileLayer( 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'A tool by <a href="https://theopolis.me">@theopolisme</a> \
                (<a href="https://github.com/theopolisme/wikipedia-contributor-locations">source code</a> / \
                <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=theo%40theopatt%2ecom&lc=US&item_name=Support%20more%20free%20%26%20open%20source%20software%20development%20%3a%29&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donate_SM%2egif%3aNonHosted">donate</a>). \
                Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors. This service incorporates GeoLite2 data created \
                by <a href="http://www.maxmind.com">MaxMind</a>.',
            maxZoom: 18,
            minZoom: 2
        } ).addTo( map );        
    }

    function setUpTitleInput () {
        $( '#titlesInput' ).select2( {
            multiple: true,
            minimumInputLength: 1,
            formatInputTooShort: 'Please enter 1 or more characters',
            ajax: {
                url: SUGGEST_ENDPOINT,
                type: 'GET',
                dataType: 'json',
                delay: 250,
                data: function ( term ) {
                    return {
                        base_url: $( '#baseUrl' ).val(),
                        search: term
                    }
                },
                results: function ( data ) {
                    return {
                        results: data.results.map( function ( v ) {
                            return { id: v, text: v };
                        } )
                    }
                },
                cache: true,
                minimumInputLength: 1
            },
            width: '290px'
        } );
    }

    function setUpFormSubmitHandler () {
        $( 'form' ).submit( function ( e ) {
            var titleVal = $( '#titlesInput' ).val(),
                titles = titleVal ? titleVal.split( ',' ) : [],
                baseUrl = $( '#baseUrl' ).val();

            if ( !titles.length ) {
                $( '#s2id_autogen1' ).focus();
                return false;
            }

            window.location.hash = '#!/map/' + baseUrl + '/' + encodeURIComponent( titles.join( '&&' ) );
            return false;
        } );
    }

    function setUpRouter () {
        router = new Rlite();

        router.add( 'main', function () {
            window.document.title = 'Wikipedia Article Contributor Locations';
            showMain();
            NProgress.done();
        } );

        router.add( 'map/:baseUrl/:title', function ( r ) {  
            var pieces = decodeURIComponent( r.params.title ).split( '&&' );
            window.document.title = pieces.join( ', ' ) + ' | Wikipedia Article Contributor Locations';
            showLocationsLayers( pieces, r.params.baseUrl );
        } );

        function onHashChange () {
            var pageFound,
                hash = window.location.hash || '#!/';

            if ( currentRequest ) {
                currentRequest.abort();
            }

            currentControllers.forEach( function ( controller ) {
                controller.destroy();
            } );
            currentControllers = [];

            pageFound = router.run( hash.substr( 3 ) );

            if ( pageFound ) {
                // Track in Google Analytics
                ga( 'send', 'pageview', location.pathname + location.search + location.hash );
            } else {
                // Redirect to main
                window.location.hash = '#!/main';
            }
        }

        window.onhashchange = onHashChange;

        if ( !window.location.hash ) {
            window.location.hash = '#!/main';
        }

        onHashChange();
    }

    function setUp () {
        NProgress.start();

        setUpMap();
        setUpTitleInput();
        setUpFormSubmitHandler();
        setUpRouter();

        $( '#titles' ).tooltipster();
        $( 'a' ).not( '[href^="#"]' ).attr( 'target', '_blank' );
    }

    setUp();

}( jQuery, L, NProgress, Rlite, ga, randomColor ) );
