Import("env")
import shutil
import gzip
import os
#
# Dump build environment (for debug)
# print env.Dump()
#

#
# Upload actions
#

def before_buildfs(source, target, env):
	os.remove('./data/required.css.gz');
	os.remove('./data/required.js.gz');
	with open('./spiffs_src/required.css', 'rb') as f_in:
		with gzip.open('./data/required.css.gz', 'wb') as f_out:
			shutil.copyfileobj(f_in, f_out)
	with open('./spiffs_src/required.js', 'rb') as f_in:
		with gzip.open('./data/required.js.gz', 'wb') as f_out:
			shutil.copyfileobj(f_in, f_out)

env.AddPreAction('$BUILD_DIR/spiffs.bin', before_buildfs);