Import("env")
import os
import shutil


def after_build(source, target, env):
	output_name = "{}.bin".format(env.subst("$PIOENV"))
	shutil.copy(firmware_source, os.path.join("bin", output_name))


env.AddPostAction("buildprog", after_build)

firmware_source = os.path.join(env.subst("$BUILD_DIR"), "firmware.bin")
