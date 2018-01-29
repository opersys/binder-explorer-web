LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE := OsysBE
LOCAL_MODULE_CLASS := EXECUTABLES
LOCAL_MODULE_TAGS := optional
LOCAL_SRC_FILES := OsysBE
LOCAL_MODULE_PATH := $(TARGET_OUT)/bin

LOCAL_POST_INSTALL_CMD := \
	mkdir -p $(TARGET_OUT)/Osys/BE; \
	cp -af $(LOCAL_PATH)/dist_$(TARGET_ARCH)/* $(TARGET_OUT)/Osys/BE
include $(BUILD_PREBUILT)
