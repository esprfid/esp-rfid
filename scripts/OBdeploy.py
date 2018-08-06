Import("env")
import shutil
import os
#
# Dump build environment (for debug)
# print env.Dump()
#

#
# Upload actions
#

def after_build(source, target, env):
	shutil.copy(firmware_source, 'bin/forV2Board.bin')

env.AddPostAction("buildprog", after_build)

firmware_source = os.path.join(env.subst("$BUILD_DIR"), "firmware.bin")
