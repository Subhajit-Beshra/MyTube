function locationErrorMessage(code) {
  if (code === 1) return "Location permission was denied. You can change this in your browser or device settings.";
  if (code === 2) return "Your device could not determine its location. Try again when location services are available.";
  if (code === 3) return "The location request timed out. Please try again.";
  return "Could not check location permission.";
}

function requestLocationPermission(provider) {
  if (!provider) {
    return Promise.reject(new Error("Location services are not available in this browser."));
  }

  return new Promise((resolve, reject) => {
    provider.getCurrentPosition(
      () => resolve(),
      (error) => reject(new Error(locationErrorMessage(error.code))),
      { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 },
    );
  });
}

exports.requestLocationPermission = requestLocationPermission;
