import os
import shutil

Import('env')

# Dump build environment (for debug)
# print env.Dump()

def after_build(source, target, env):
	shutil.copy(
		os.path.join(env.subst('$BUILD_DIR'), 'firmware.bin'),
		os.path.join('bin', 'esp-rfid.bin'))

env.AddPostAction('buildprog', after_build)
