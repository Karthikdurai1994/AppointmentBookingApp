require("dotenv").config();
const express = require("express");
const admin = require("firebase-admin");
var moment = require("moment-timezone");
var bodyParser = require("body-parser");
var _ = require("lodash");
const { result } = require("lodash");
const { firestore } = require("firebase-admin");
const app = new express();
const PORT = process.env.PORT || 3000;
var startHours = "10:00 AM";
var endHours = "5:00 PM";
var slotDuration = 30;
var timeZone = "Asia/Kolkata";
var timeSlot = [];

//Setting Up FireStore
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIRESTORE_API_KEY)),
});
const db = admin.firestore();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

//When No End Point provided
app.get("", (req, res) => {
  res.send("Welcome");
});

//free slot checking API
app.post("/freeSlots", async (req, res) => {
  timeSlot = [];
  var flag = 0;
  var f = 0;
  const eventCreated = req.body;
  var startTime = moment("10:00 AM", "hh:mm A").format("hh:mm A");
  var endTime = moment("05:00 PM", "hh:mm A").format("hh:mm A");
  var eventRef = db.collection("events");
  eventRef = await eventRef.where("date", "==", eventCreated.date).get();
  if (eventRef.empty) {
    while (moment(startTime, "hh:mm A") <= moment(endTime, "hh:mm A")) {
      timeSlot.push(
        moment(startTime, "hh:mm A").tz(eventCreated.timezone).format("hh:mm A")
      );
      startTime = moment(startTime, "hh:mm A").add(30, "m");
    }
    res.send(timeSlot);
  } else {
    while (moment(startTime, "hh:mm A") <= moment(endTime, "hh:mm A")) {
      f = 0;
      eventRef.forEach((data) => {
        if (
          moment(startTime, "hh:mm A").format("hh:mm A") ==
          moment(data.data().time, "hh:mm A").format("hh:mm A")
        ) {
          flag = 0;
          f = 1;
        } else if (
          moment(data.data().time, "hh:mm A").format("hh:mm A") <
          moment(startTime, "hh:mm A").format("hh:mm A")
        ) {
          var timeConverted = moment(data.data().time, "hh:mm A").add(
            data.data().duration,
            "m"
          );
          if (
            moment(startTime, "hh:mm A").format("hh:mm A") >=
            moment(timeConverted, "hh:mm A").format("hh:mm A")
          ) {
            flag = 1;
          } else if (
            moment(startTime, "hh:mm A").format("hh:mm A") <
            moment(timeConverted, "hh:mm A").format("hh:mm A")
          ) {
            flag = 0;
            f = 1;
          }
        }
      });
      if (flag == 1 && f == 0) {
        timeSlot.push(
          moment(startTime, "hh:mm A")
            .tz(eventCreated.timezone)
            .format("hh:mm A")
        );
      }
      startTime = moment(startTime, "hh:mm A").add(30, "m");
    }

    res.send(timeSlot);
  }
});

// create event API
app.post("/createEvent", async (req, res) => {
  const eventCreated = req.body;
  var dateBooking = req.body.date;
  var timeSlotBooking = req.body.time;
  var durationBooking = req.body.duration;
  var timeZoneBooking = req.body.timezone;
  var dateConverted = dateBooking + " " + timeSlotBooking;
  var flag = 0;
  var f = 0;
  var userTimeZoneConverted = moment(dateConverted, "DD/MM/YYYY hh:mm A").tz(
    timeZoneBooking,
    true
  );
  var localTimeZoneConverted = moment(
    userTimeZoneConverted,
    "DD/MM/YYYY hh:mm A"
  ).tz(timeZone);
  var startTime =
    localTimeZoneConverted.format("DD/MM/YYYY") + " " + startHours;
  var endTime = localTimeZoneConverted.format("DD/MM/YYYY") + " " + endHours;
  var startTimeISO = moment(startTime, "DD/MM/YYYY hh:mm A").toISOString();
  var endTimeISO = moment(endTime, "DD/MM/YYYY hh:mm A").toISOString();
  var localTimeISO = localTimeZoneConverted.toISOString();
  if (localTimeISO >= startTimeISO && localTimeISO <= endTimeISO) {
    var eventRef = db.collection("events");
    eventRef = await eventRef
      .where("date", "==", localTimeZoneConverted.format("DD/MM/YYYY"))
      .get();
    if (eventRef.empty) {
      db.collection("events")
        .doc()
        .set({
          date: localTimeZoneConverted.format("DD/MM/YYYY"),
          time: localTimeZoneConverted.format("hh:mm A"),
          duration: eventCreated.duration,
          timestamp: moment(localTimeZoneConverted),
        })
        .then((data) => {
          console.log(data);
          res.status(200).send("Appointment Created Successfully");
        })
        .catch((err) => {
          console.log("Error: ", err);
          res.send(err);
        });
    } else {
      eventRef.forEach((data) => {
        if (
          moment(localTimeZoneConverted, "DD/MM/YYYY hh:mm A").format(
            "hh:mm A"
          ) == moment(data.data().time, "hh:mm A").format("hh:mm A")
        ) {
          flag = 0;
          f = 1;
        } else if (
          moment(data.data().time, "hh:mm A").format("hh:mm A") <
          moment(localTimeZoneConverted, "DD/MM/YYYY hh:mm A").format("hh:mm A")
        ) {
          var timeConverted = moment(data.data().time, "hh:mm A").add(
            data.data().duration,
            "m"
          );
          if (
            moment(localTimeZoneConverted, "DD/MM/YYYY hh:mm A").format(
              "hh:mm A"
            ) >= moment(timeConverted, "hh:mm A").format("hh:mm A")
          ) {
            flag = 1;
          } else if (
            moment(localTimeZoneConverted, "DD/MM/YYYY hh:mm A").format(
              "hh:mm A"
            ) < moment(timeConverted, "hh:mm A").format("hh:mm A")
          ) {
            flag = 0;
            f = 1;
          }
        } else if (
          moment(data.data().time, "hh:mm A").format("hh:mm A") >
          moment(localTimeZoneConverted, "DD/MM/YYYY hh:mm A").format("hh:mm A")
        ) {
          var timeConverted = moment(
            localTimeZoneConverted,
            "DD/MM/YYYY hh:mm A"
          ).add(durationBooking, "m");
          if (
            moment(timeConverted, "hh:mm A").format("hh:mm A") <=
            moment(data.data().time, "hh:mm A").format("hh:mm A")
          ) {
            flag = 1;
          } else if (
            moment(timeConverted, "hh:mm A").format("hh:mm A") >
            moment(data.data().time, "hh:mm A").format("hh:mm A")
          ) {
            flag = 0;
            f = 1;
          }
        }
      });
      if (flag == 1 && f == 0) {
        db.collection("events")
          .doc()
          .set({
            date: localTimeZoneConverted.format("DD/MM/YYYY"),
            time: localTimeZoneConverted.format("hh:mm A"),
            duration: eventCreated.duration,
            timestamp: moment(localTimeZoneConverted),
          })
          .then((data) => {
            console.log(data);
            res.status(200).send("Appointment Created Successfully");
          })
          .catch((err) => {
            console.log("Error: ", err);
            res.send(err);
          });
      } else {
        console.log("Event Already Created");
        res.status(422).send("Appointment Already Fixed by someone");
      }
    }
  } else {
    res.send("No Slot Available");
  }
});

// fetch events between start date and end date API
app.post("/getEvents", async (req, res) => {
  var startDate = req.body.startdate;
  var endDate = req.body.enddate;
  var eventRef = db.collection("events");

  var arr = [];
  eventRef = await eventRef.get();
  eventRef.forEach((data) => {
    if (
      moment.unix(data.data().timestamp._seconds).format("DD/MM/YYYY") >=
        moment(startDate, "DD/MM/YYYY").format("DD/MM/YYYY") &&
      moment.unix(data.data().timestamp._seconds).format("DD/MM/YYYY") <=
        moment(endDate, "DD/MM/YYYY").format("DD/MM/YYYY")
    ) {
      arr.push(
        moment
          .unix(data.data().timestamp._seconds)
          .format("DD/MM/YYYY - hh:mm A")
      );
    }
  });
  if (arr.length == 0) {
    res.send("No Events available between " + startDate + " to " + endDate);
  } else {
    res.send(arr);
  }
});

app.listen(PORT, () => {
  console.log("Server is listening at Port: " + PORT);
});
