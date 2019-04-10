(function() {
  // Retrieve your client ID from the Google Developers Console at
  // https://console.developers.google.com/.
  var OAUTH2_CLIENT_ID = '261890721849-ku4qmchnsra5jaouid611646g4v41ssj.apps.googleusercontent.com';
  var OAUTH2_SCOPES = [
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/youtube.readonly'
  ];

  // Keep track of the currently authenticated user's YouTube channel ID.
  var channelId;
  var startDay = new Date(2005,1,14);

  // For information about the Google Chart Tools API, see:
  // https://developers.google.com/chart/interactive/docs/quick_start
  google.load('visualization', '1.0', {'packages': ['corechart']});

  // Upon loading, the Google APIs JS client automatically invokes this callback.
  // See https://developers.google.com/api-client-library/javascript/features/authentication 
  window.onJSClientLoad = function() {
    gapi.auth.init(function() {
      window.setTimeout(checkAuth, 1);
    });
  };

  // Attempt the immediate OAuth 2.0 client flow as soon as the page loads.
  // If the currently logged-in Google Account has previously authorized
  // the client specified as the OAUTH2_CLIENT_ID, then the authorization
  // succeeds with no user intervention. Otherwise, it fails and the
  // user interface that prompts for authorization needs to display.
  function checkAuth() {
    gapi.auth.authorize({
      client_id: OAUTH2_CLIENT_ID,
      scope: OAUTH2_SCOPES,
      immediate: false
    }, handleAuthResult);
  }

  // Handle the result of a gapi.auth.authorize() call.
  function handleAuthResult(authResult) {
    if (authResult) {
      // Authorization was successful. Hide authorization prompts and show
      // content that should be visible after authorization succeeds.
      $('.pre-auth').hide();
      $('.post-auth').show();

      loadAPIClientInterfaces();
    } else {
      // Authorization was unsuccessful. Show content related to prompting for
      // authorization and hide content that should be visible if authorization
      // succeeds.
      $('.post-auth').hide();
      $('.pre-auth').show();

      // Make the #login-link clickable. Attempt a non-immediate OAuth 2.0
      // client flow. The current function is called when that flow completes.
      $('#login-link').click(function() {
        gapi.auth.authorize({
          client_id: OAUTH2_CLIENT_ID,
          scope: OAUTH2_SCOPES,
          immediate: false
        }, handleAuthResult);
      });
    }
  }

  // Load the client interfaces for the YouTube Analytics and Data APIs, which
  // are required to use the Google APIs JS client. More info is available at
  // https://developers.google.com/api-client-library/javascript/dev/dev_jscript#loading-the-client-library-and-the-api
  function loadAPIClientInterfaces() {
    gapi.client.load('youtube', 'v3', function() {
      return gapi.client.load('https://youtubeanalytics.googleapis.com/$discovery/rest?version=v2')
        .then( function () {
            // After both client interfaces load, use the Data API to request
            // information about the authenticated user's channel.
            getUserChannel();
          },
          function(err) { console.error("Error loading GAPI client for API", err); }
        );        
    });
  }

  // Call the Data API to retrieve information about the currently
  // authenticated user's YouTube channel.
  function getUserChannel() {
    // Also see: https://developers.google.com/youtube/v3/docs/channels/list
    var request = gapi.client.youtube.channels.list({
      // Setting the "mine" request parameter's value to "true" indicates that
      // you want to retrieve the currently authenticated user's channel.
      mine: true,
      part: 'snippet,statistics',
      fields: 'items(id,snippet(title,description,customUrl,publishedAt,thumbnails(high)),statistics(subscriberCount,videoCount,viewCount))'
    });

    request.execute(function(response) {
      if ('error' in response) {
        displayMessage(response.error.message);
      } else {
        // We need the channel's channel ID to make calls to the Analytics API.
        // The channel ID value has the form "UCdLFeWKpkLhkguiMZUp8lWA".
        channelId = response.items[0].id;
        displayChannelProfile(response);
        displayChannelAnalytics();
      }
    });
  }
  
  // This function displays channel details.
  function displayChannelProfile(response) {
    if (channelId) {
      hideMessage();
      $('#c-name').text(response.items[0].snippet.title);
      $('#c-tag').text(response.items[0].snippet.description);
      $('#c-link').attr('href', 'https://www.youtube.com/' + response.items[0].snippet.customUrl)
      $('#c-img').attr('src',response.items[0].snippet.thumbnails.high.url);
      $('#s-vids').text(response.items[0].statistics.videoCount);
      $('#s-subs').text(response.items[0].statistics.subscriberCount);
      $('#s-views').text(response.items[0].statistics.viewCount);
      startDay = new Date(response.items[0].snippet.publishedAt);
      // console.log('start at ' + startDay);
    } else {
      // The currently authenticated user's channel ID is not available.
      displayMessage('The YouTube channel ID for the current user is not available.');
    }
  }
  
  // This function requests YouTube Analytics data for the channel and displays
  // the results in a chart.
  function displayChannelAnalytics() {
    if (channelId) {
      // console.log(channelId);
      // To use a different date range, modify the ONE_MONTH_IN_MILLISECONDS
      // variable to a different millisecond delta as desired.
      var today = new Date();
      var lastMonth = new Date(today.getTime() - 2592000000);

      // Request gets lifetime views, minutes, subscribers.
      var request1 = gapi.client.youtubeAnalytics.reports.query({
        // The startDate and endDate parameters must be YYYY-MM-DD strings.
        'startDate': formatDateString(startDay),
        'endDate': formatDateString(today),
        // At this time, you need to explicitly specify channel==channelId.
        // See https://developers.google.com/youtube/analytics/v2/#ids
        ids: 'channel==' + channelId,
        dimensions: 'day',
        sort: 'day',
        // See https://developers.google.com/youtube/analytics/v2/available_reports
        // for details about the different filters and metrics you can request
        // if the "dimensions" parameter value is "day".
        metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost'
        //filters: 'video==' + videoId
      });

      // Request gets lifetime views, minutes, subscribers.
      var request2 = gapi.client.youtubeAnalytics.reports.query({
        // The startDate and endDate parameters must be YYYY-MM-DD strings.
        'startDate': formatDateString(lastMonth),
        'endDate': formatDateString(today),
        // At this time, you need to explicitly specify channel==channelId.
        // See https://developers.google.com/youtube/analytics/v2/#ids
        ids: 'channel==' + channelId,
        dimensions: 'day',
        sort: 'day',
        // See https://developers.google.com/youtube/analytics/v2/available_reports
        // for details about the different filters and metrics you can request
        // if the "dimensions" parameter value is "day".
        metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost'
        //filters: 'video==' + videoId
      });
      
      startDay = new Date(2018,1,1);

      var request3 = gapi.client.youtubeAnalytics.reports.query({
        // The startDate and endDate parameters must be YYYY-MM-DD strings.
        'startDate': formatDateString(startDay),
        'endDate': formatDateString(today),
        // At this time, you need to explicitly specify channel==channelId.
        // See https://developers.google.com/youtube/analytics/v2/#ids
        ids: 'channel==' + channelId,
        dimensions: 'video',
        sort: '-views',
        'maxResults': 10,
        // See https://developers.google.com/youtube/analytics/v2/available_reports
        // for details about the different filters and metrics you can request
        // if the "dimensions" parameter value is "day".
        metrics: 'views'
        //filters: 'video==' + videoId
      });

      // Exceute and display chart.
      request1.execute(function(response) {
        // This function is called regardless of whether the request succeeds.
        // The response contains YouTube Analytics data or an error message.
        if ('error' in response) {
          displayMessage(response.error.message);
        } else {
          //console.log(response);
          displayChart(response, 'chart1');
        }
      });
      
      // Exceute and display response.
      request2.execute(function(response) {
        // This function is called regardless of whether the request succeeds.
        // The response contains YouTube Analytics data or an error message.
        if ('error' in response) {
          console.log(response.error.message);
        } else {
          //console.log(response);
          displayChart(response, 'chart2');
        }
      });
    } else {
      // The currently authenticated user's channel ID is not available.
      displayMessage('The YouTube channel ID for the current user is not available.');
    }
  }

  // This boilerplate code takes a Date object and returns a YYYY-MM-DD string.
  function formatDateString(date) {
    var yyyy = date.getFullYear().toString();
    var mm = padToTwoCharacters(date.getMonth() + 1);
    var dd = padToTwoCharacters(date.getDate());

    return yyyy + '-' + mm + '-' + dd;
  }

  // If number is a single digit, prepend a '0'. Otherwise, return the number
  //  as a string.
  function padToTwoCharacters(number) {
    if (number < 10) {
      return '0' + number;
    } else {
      return number.toString();
    }
  }

  // Call the Google Chart Tools API to generate a chart of Analytics data.
  function displayChart(response, el) {
    if ('rows' in response) {
      hideMessage();
      // console.log(response);
      // The columnHeaders property contains an array of objects representing
      // each column's title -- e.g.: [{name:"day"},{name:"views"}]
      // We need these column titles as a simple array, so we call jQuery.map()
      // to get each element's "name" property and create a new array that only
      // contains those values.
      //var columns = $.map(response.columnHeaders, function(item) {
        //return item.name;
      //});
      var ins = [-1, -1, -1, -1, -1];
      var columns = [];
      
      response.columnHeaders.forEach(function(item, ind) {
        if (item.name == 'day') {
          ins[0] = ind;
          columns.push('Day');
        }
        else if (item.name == 'views') {
          ins[1] = ind;
          columns.push('Views'); 
        }
        else if (item.name == 'estimatedMinutesWatched') {
          ins[2] = ind;
          columns.push('Minutes'); 
        }
        else if (item.name == 'subscribersGained') {
          ins[3] = ind;
        }
        else if (item.name == 'subscribersLost') {
          ins[4] = ind;
        };
      });
      
      var chart = [];
      var totV = 0;
      var totM = 0;
      response.rows.forEach(function(row){
        var dat = row[0];
        //Date is a yyyy-mm-dd string.
        dat = new Date(dat);
        var vi = row[1];
        var mi = row[2];
        totV = totV + vi;
        totM = totM + mi;
        chart.push([dat, totV, totM]);
      });
      // The google.visualization.arrayToDataTable() function wants an array
      // of arrays. The first element is an array of column titles, calculated
      // above as "columns". The remaining elements are arrays that each
      // represent a row of data. Fortunately, response.rows is already in
      // this format, so it can just be concatenated.
      // See https://developers.google.com/chart/interactive/docs/datatables_dataviews#arraytodatatable
      //var chartDataArray = [columns].concat(response.rows);

      var chartDataArray = [columns].concat(chart);
      var chartDataTable = google.visualization.arrayToDataTable(chartDataArray);
      var formatter = new google.visualization.DateFormat({pattern: 'MMM d, yyyy'});
      formatter.format(chartDataTable, 0);

      var chart = new google.visualization.LineChart(document.getElementById(el));
      chart.draw(chartDataTable, {
        // Additional options can be set if desired as described at:
        // https://developers.google.com/chart/interactive/docs/reference#visdraw
        legend: 'none',
        theme: 'maximized',
        series: {
          0: { color: '#283f63',
              targetAxisIndex: 0 },
          1: { color: '#ffa665',
              targetAxisIndex: 1 }
        },
        vAxes: {
          0: {
            textStyle: { color: '#3d5c8c' },
          },
          1: {
            textStyle: { color: '#ffa665' }
          }
        },
        animation: {
          startup: true,
          duration: 1000,
          easing: 'inAndOut'
        },
        fontName: 'Open Sans',
        hAxis: {
          format: "MMM ''yy",
          textStyle: {
            color: '#3d5c8c',
            fontSize: 10
          },
          gridlines: {
            color: '#fff4ec'
          },
          baselineColor: '#fff4ec'
        },
        vAxis: {
          textStyle: {
            fontSize: 10
          },
          gridlines: {
            color: '#fff4ec'
          },
          baselineColor: '#fff4ec'
        }
      });
      
    } else {
      displayMessage('No data available for channel ' + channelId);
    }
  }

  // This helper method displays a message on the page.
  function displayMessage(message) {
    $('#message').text(message).show();
  }

  // This helper method hides a previously displayed message on the page.
  function hideMessage() {
    $('#message').hide();
  }
})();