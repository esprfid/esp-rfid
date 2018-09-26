#ifndef __SERIAL_LOG_H__
#define __SERIAL_LOG_H__


#define SERIAL_LOG_LEVEL_NONE         (0)
#define SERIAL_LOG_LEVEL_ERROR        (1)
#define SERIAL_LOG_LEVEL_WARN         (2)
#define SERIAL_LOG_LEVEL_INFO         (3)
#define SERIAL_LOG_LEVEL_DEBUG        (4)
#define SERIAL_LOG_LEVEL_VERBOSE      (5)


#ifndef SERIAL_LOG_LEVEL
	#define SERIAL_LOG_LEVEL SERIAL_LOG_LEVEL_NONE
#endif

#ifndef SERIAL_LOG_BAUDRATE
	#define SERIAL_LOG_BAUDRATE 115200
#endif

#ifndef SERIAL_LOG_COLORFUL
	#define SERIAL_LOG_COLORFUL 0
#endif

#if SERIAL_LOG_COLORFUL
	#define SERIAL_LOG_COLOR_BLACK    "30"
	#define SERIAL_LOG_COLOR_RED      "31"
	#define SERIAL_LOG_COLOR_GREEN    "32"
	#define SERIAL_LOG_COLOR_YELLOW   "33"
	#define SERIAL_LOG_COLOR_BLUE     "34"
	#define SERIAL_LOG_COLOR_MAGENTA  "35"
	#define SERIAL_LOG_COLOR_CYAN     "36"
	#define SERIAL_LOG_COLOR_GRAY     "37"
	#define SERIAL_LOG_COLOR_WHITE    "38"

	#define SERIAL_LOG_COLOR(COLOR)   "\033[0;" COLOR "m"
	#define SERIAL_LOG_BOLD(COLOR)    "\033[1;" COLOR "m"
	#define SERIAL_LOG_RESET_COLOR    "\033[0m"

	#define SERIAL_LOG_COLOR_ERROR    SERIAL_LOG_COLOR(SERIAL_LOG_COLOR_RED)
	#define SERIAL_LOG_COLOR_WARN     SERIAL_LOG_COLOR(SERIAL_LOG_COLOR_YELLOW)
	#define SERIAL_LOG_COLOR_INFO     SERIAL_LOG_COLOR(SERIAL_LOG_COLOR_GREEN)
	#define SERIAL_LOG_COLOR_DEBUG    SERIAL_LOG_COLOR(SERIAL_LOG_COLOR_CYAN)
	#define SERIAL_LOG_COLOR_VERBOSE  SERIAL_LOG_COLOR(SERIAL_LOG_COLOR_GRAY)
#else
	#define SERIAL_LOG_COLOR_ERROR  
	#define SERIAL_LOG_COLOR_WARN   
	#define SERIAL_LOG_COLOR_INFO   
	#define SERIAL_LOG_COLOR_DEBUG  
	#define SERIAL_LOG_COLOR_VERBOSE
	#define SERIAL_LOG_RESET_COLOR
#endif

#if SERIAL_LOG_LEVEL != SERIAL_LOG_LEVEL_NONE
	#define SERIAL_LOG_INIT() do { Serial.begin(SERIAL_LOG_BAUDRATE); Serial.println(); } while(0)
#else
	#define SERIAL_LOG_INIT()
#endif


#define log_printf(format, ...) Serial.printf(format, ##__VA_ARGS__)

#define SERIAL_LOG_FORMAT(level, format) SERIAL_LOG_COLOR_ ## level "[ " #level " ] " format SERIAL_LOG_RESET_COLOR "\r\n"

#if SERIAL_LOG_LEVEL >= SERIAL_LOG_LEVEL_VERBOSE
	#define log_v(format, ...) log_printf(SERIAL_LOG_FORMAT(VERBOSE, format), ##__VA_ARGS__)
#else
	#define log_v(format, ...)
#endif

#if SERIAL_LOG_LEVEL >= SERIAL_LOG_LEVEL_DEBUG
	#define log_d(format, ...) log_printf(SERIAL_LOG_FORMAT(DEBUG, format), ##__VA_ARGS__)
#else
	#define log_d(format, ...)
#endif

#if SERIAL_LOG_LEVEL >= SERIAL_LOG_LEVEL_INFO
	#define log_i(format, ...) log_printf(SERIAL_LOG_FORMAT(INFO, format), ##__VA_ARGS__)
#else
	#define log_i(format, ...)
#endif

#if SERIAL_LOG_LEVEL >= SERIAL_LOG_LEVEL_WARN
	#define log_w(format, ...) log_printf(SERIAL_LOG_FORMAT(WARN, format), ##__VA_ARGS__)
#else
	#define log_w(format, ...)
#endif

#if SERIAL_LOG_LEVEL >= SERIAL_LOG_LEVEL_ERROR
	#define log_e(format, ...) log_printf(SERIAL_LOG_FORMAT(ERROR, format), ##__VA_ARGS__)
#else
	#define log_e(format, ...)
#endif

#if SERIAL_LOG_LEVEL >= SERIAL_LOG_LEVEL_NONE
	#define log_n(format, ...) log_printf(SERIAL_LOG_FORMAT(ERROR, format), ##__VA_ARGS__)
#else
	#define log_n(format, ...)
#endif

#define ESP_LOGE(tag, ...)  log_e(__VA_ARGS__)
#define ESP_LOGW(tag, ...)  log_w(__VA_ARGS__)
#define ESP_LOGI(tag, ...)  log_i(__VA_ARGS__)
#define ESP_LOGD(tag, ...)  log_d(__VA_ARGS__)
#define ESP_LOGV(tag, ...)  log_v(__VA_ARGS__)

#endif
