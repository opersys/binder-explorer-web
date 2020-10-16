LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE := OsysBE
LOCAL_MODULE_CLASS := EXECUTABLES
LOCAL_MODULE_TAGS := optional
LOCAL_SRC_FILES := OsysBE
LOCAL_MODULE_PATH := $(TARGET_OUT)/bin

LOCAL_POST_INSTALL_CMD := \
	mkdir -p $(TARGET_OUT)/Osys/BE; \
	cp -af $(LOCAL_PATH)/dist_$(TARGET_ARCH)/* $(TARGET_OUT)/Osys/BE; \
	for f in `find $(TARGET_OUT)/Osys/BE -name "*.node"`; do mv -v $$f $(TARGET_OUT)/lib64 && ln -vsfr $(TARGET_OUT)/lib64/$$(basename $$f) $$f; done

include $(BUILD_PREBUILT)

