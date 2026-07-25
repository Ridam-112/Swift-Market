package com.swiftmart.app;

import android.content.Intent;
import androidx.appcompat.app.AppCompatActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.truecaller.android.sdk.ITrueCallback;
import com.truecaller.android.sdk.TrueError;
import com.truecaller.android.sdk.TruecallerSDK;
import com.truecaller.android.sdk.TruecallerSdkScope;
import com.truecaller.android.sdk.TruecallerUserProfile;

/**
 * Capacitor plugin that wraps the Truecaller Android SDK.
 *
 * Flow:
 *   JS calls TruecallerPlugin.login()
 *   → SDK shows Truecaller bottom-sheet consent
 *   → onSuccessProfileShared returns { accessToken, firstName, lastName, phoneNumber }
 *   → Frontend posts accessToken to POST /api/auth/truecaller for server-side verification
 */
@CapacitorPlugin(name = "Truecaller")
public class TruecallerPlugin extends Plugin implements ITrueCallback {

    private PluginCall savedCall;

    // ── login ─────────────────────────────────────────────────────────────────
    @PluginMethod
    public void login(PluginCall call) {
        savedCall = call;

        String appKey = getConfig().getString("appKey", "");
        if (appKey == null || appKey.isEmpty()) {
            call.reject("TRUECALLER_NOT_CONFIGURED", "Truecaller appKey is not set in capacitor.config.ts");
            return;
        }

        getActivity().runOnUiThread(() -> {
            TruecallerSdkScope trueScope = new TruecallerSdkScope.Builder(getContext(), this)
                    .consentMode(TruecallerSdkScope.CONSENT_MODE_BOTTOMSHEET)
                    .consentTitleOption(TruecallerSdkScope.SDK_CONSENT_TITLE_LOG_IN)
                    .footerType(TruecallerSdkScope.FOOTER_TYPE_SKIP)
                    .sdkOptions(TruecallerSdkScope.SDK_OPTION_WITHOUT_OTP)
                    .build();

            TruecallerSDK.init(trueScope);

            if (!TruecallerSDK.getInstance().isUsable()) {
                if (savedCall != null) {
                    savedCall.reject("TRUECALLER_NOT_INSTALLED",
                            "Truecaller app is not installed on this device");
                    savedCall = null;
                }
                return;
            }

            TruecallerSDK.getInstance().getUserProfile((AppCompatActivity) getActivity());
        });
    }

    // ── isAvailable ───────────────────────────────────────────────────────────
    @PluginMethod
    public void isAvailable(PluginCall call) {
        String appKey = getConfig().getString("appKey", "");
        if (appKey == null || appKey.isEmpty()) {
            JSObject r = new JSObject();
            r.put("available", false);
            call.resolve(r);
            return;
        }

        getActivity().runOnUiThread(() -> {
            boolean available = false;
            try {
                // Initialise with a minimal scope just to call isUsable()
                TruecallerSdkScope scope = new TruecallerSdkScope.Builder(getContext(), this)
                        .sdkOptions(TruecallerSdkScope.SDK_OPTION_WITHOUT_OTP)
                        .build();
                TruecallerSDK.init(scope);
                available = TruecallerSDK.getInstance().isUsable();
            } catch (Exception ignored) { }
            JSObject r = new JSObject();
            r.put("available", available);
            call.resolve(r);
        });
    }

    // ── ITrueCallback ─────────────────────────────────────────────────────────

    @Override
    public void onSuccessProfileShared(TruecallerUserProfile trueProfile) {
        if (savedCall == null) return;
        JSObject result = new JSObject();
        result.put("accessToken", trueProfile.getAccessToken());
        result.put("firstName", trueProfile.getFirstName());
        result.put("lastName", trueProfile.getLastName());
        result.put("phoneNumber", trueProfile.getPhoneNumber());
        result.put("countryCode", trueProfile.getCountryCode());
        savedCall.resolve(result);
        savedCall = null;
    }

    @Override
    public void onFailureProfileShared(TrueError trueError) {
        if (savedCall == null) return;
        savedCall.reject("TC_ERROR", "Truecaller error: " + trueError.getErrorType());
        savedCall = null;
    }

    @Override
    public void onVerificationRequired(TrueError trueError) {
        if (savedCall == null) return;
        // Truecaller requires manual phone verification — not available in this flow
        savedCall.reject("TRUECALLER_NOT_INSTALLED",
                "Truecaller profile could not be verified on this device");
        savedCall = null;
    }

    // ── Activity result passthrough ───────────────────────────────────────────

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        try {
            if (TruecallerSDK.getInstance() != null) {
                TruecallerSDK.getInstance().onActivityResultObtained(
                        (AppCompatActivity) getActivity(), requestCode, resultCode, data);
            }
        } catch (Exception ignored) { }
    }
}
