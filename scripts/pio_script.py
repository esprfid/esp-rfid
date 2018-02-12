Import("env")
import shutil
import os
#
# Dump build environment (for debug)
#print env.Dump()
#

#
# Upload actions
#

env.Replace(
    MYUPLOADERFLAGS=[
        "-vv",
        "-cd", "nodemcu",
        "-cb", "$UPLOAD_SPEED",
        "-cp", "$UPLOAD_PORT",
        "-ca", "0x00000",
        "-cf", "$SOURCE"
    ],
    UPLOADCMD='$UPLOADER $MYUPLOADERFLAGS',
)

def after_buildfs(source, target, env):
	shutil.copy(spiffs_source, 'compiledbin/latestspiffs.bin')

def after_build(source, target, env):
	shutil.copy(firmware_source, 'compiledbin/latest.bin')

env.AddPostAction('$BUILD_DIR/spiffs.bin', after_buildfs);
env.AddPostAction("buildprog", after_build)

spiffs_source = os.path.join(env.subst("$BUILD_DIR"), "spiffs.bin")
firmware_source = os.path.join(env.subst("$BUILD_DIR"), "firmware.bin")
