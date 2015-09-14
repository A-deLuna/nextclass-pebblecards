var fs = require('fs');
var http = require('http');
var express = require('express');
var request = require('request');
var app = express();

var secret = process.env.USER || fs.readFileSync('secret.txt','utf8');
//console.log(secret);
var user = process.env.USER || secret.split(' ')[0].trim();
var password = process.env.PASSWORD || secret.split(' ')[1].trim();
console.log(user);
console.log(password);

var token;
var tokenTime = new Date(1970);

function loginAndGetSchedule (res) {
  var loginPostOptions = {
    url: 'https://pacific-crag-2553.herokuapp.com/login',
    form: {user: user, password: password}
  }
  request.post(loginPostOptions, function (err, response, body) {
    if(err)console.log(err)
    var b = JSON.parse(body);
    console.log(b);
    token = b.token;
    tokenTime = b.expires;
    getSchedule(res);
  })
}

function getSchedule (res) {
  var scheduleGetOptions = {
    url: 'https://pacific-crag-2553.herokuapp.com/api/schedule',
    headers: {
      'access-token': token
    }
  }
  console.log(token);
  request.get(scheduleGetOptions, function (error, response, body){
    console.log(body);
    var schedule = JSON.parse(body);
    var nc  = getNextClass(schedule);
    var resObject = {
      content : "hora: "+ nc.hour + ":00 salón " + nc.room + " " + nc.name,
      refresh_frequency: 50,
      vibrate: 0
    }
    res.send(JSON.stringify(resObject));
  });
}

function getNextClass(schedule){
  var courseWeek = getCourseWeek(schedule);
  var date = new Date();
  var day = date.getDay();
  var hour = date.getHours();
  var i = 0;
  console.log('day ' + day);
  console.log('hour  ' + hour);
  if(!courseWeek[day][i]){
    day = (day + 1) & 7;
  }
  while(hour >= courseWeek[day][i].hour) {
    console.log("next " + courseWeek[day][i].hour + " day " + day);
    i++;
    if(!courseWeek[day][i]){
      day = (day + 1) & 7;
      i = 0;
    }
    nextHour = courseWeek[day][i].hour; 
  } 
  return courseWeek[day][i];
}

function compare (a, b) {
  return a.hour - b.hour;
}

function getCourseWeek(schedule){
  var courseWeek = [];
  for(var i = 0 ; i < 6; i ++) courseWeek[i] = []

  schedule.courses.forEach(function(course){
    course.sessions.forEach(function (session){
      var day = spanishDayCode(session.day);
      var hour = Number(session.houri.split(':')[0]);
      courseWeek[day].push({name: course.name, 
        hour: hour, 
        room: session.room});
    })
  })

  for(i = 0 ; i < 6; i ++) {
    courseWeek[i].sort(compare);
  }
  return courseWeek;
}

function spanishDayCode(day) {
  switch(day) {
    case 'Lunes':
      return 1;
      break;
    case 'Martes':
      return 2;
      break;
    case 'Miércoles':
      return 3;
      break;
    case 'Jueves':
      return 4;
      break;
    case 'Viernes':
      return 5;
      break;
    case 'Sábado':
      return 6;
      break;
  }

}

app.get('/nextclass', function (req, res) {
  if (tokenTime <= Date.now()) {
    loginAndGetSchedule(res);
  } else {
    getSchedule(res);
  }
});

app.listen(process.env.PORT || 3000);
