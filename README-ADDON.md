# ESP RFID with extended MQTT Functions

Hardware:
* Any esp-rfid board like esp-rfid-relay-board, marelab ESP-DOOR 

This has been added so far:
* Reading all user data over MQTT
* Sending User data to RFID-DOOR/ESP-RFID over MQTT
* Sending door open command over MQTT
* Sending door status over MQTT as event
* Sending Sync of a RFID-DOOR (IP/Hostname) over MQTT
* Configure Sync interval over ESP-RFID GUI
* Deleting all User of a ESP-RFID device over MQTT
* Sending log event & access data over MQTT
* Demo NODE-RED flow & GUI to centralize managment of ESP-RFID devices & users

## Using MQTT Topics
For the MQTT communication some additional TOPICs have been internaly added. The default Topic is still configured over the WebGui. If you use more then one device, all used devices should have the same <TOPIC> name configured by the WebGui. All MQTT communication is done with JSON Payload as MQTT Message. Messages send by the RFID-DOOR can be easy analysed so only the Commands that are send to the RFID devices are documented here. This is the used Topic hirachy:
          
```
(TOPIC)---+---/sync
          |
          +---/send
          |
          +---/accesslist
```
  
  If you configured over the WebGui for example (TOPIC) = "/rfid" these topic queues can be used:
  * /rfid
  * /rfid/sync
  * /rfid/send
  * /rfid/accesslist

## Commands recv by ESP-RFID
The message format is JSON it has to include the IP of the device & the command for a message recv by the ESP-RFID firmware. These messages can be received:

### getuser
Sends all useres back over the (TOPIC)/accesslist 
Json Command Format:
```
{
   cmd    :'getuser',
   doorip :'(The ESP-RFID IP of the door to open as String)'
}
```

### listusr
Sends all useres back over (TOPIC)/send 
Json Command Format:
```
{
    cmd:'listusr',
    doorip:'(The ESP-RFID IP of the door to open as String)'
}
```

### opendoor
Opens the Door / Magnetic Lock
Json Command Format:
```
{
    cmd:'opendoor',
    doorip:'(The ESP-RFID IP of the door to open as String)'
}
```

### deletusers
Delete all users. It deletes all User SPIF files. 
Json Command Format:
```
{
     cmd:'deletusers',
     doorip:'(The ESP-RFID IP of the door to open as String)'
}
```

### adduser
Adds a User as SPIF File to the device. That can be shown/edit over the WebGUI
Json Command Format:
```
{
     cmd:'adduser',
     doorip:'(The ESP-RFID IP of the door to open as String)'
}
```
