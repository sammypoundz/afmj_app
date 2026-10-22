<?php
// The URL of the API you want to call
$url = 'https://poundzapi.ajstore.pro/user/cronJobROI.php';

// Initialize a cURL session
$ch = curl_init($url);

// Set the request method to POST
curl_setopt($ch, CURLOPT_POST, 1);

// Set the content type header
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/x-www-form-urlencoded'));

// Return the response instead of outputting it
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// Execute the request and get the response
$response = curl_exec($ch);

// Check for errors
if (curl_errno($ch)) {
    $error_msg = curl_error($ch);
    echo "Error: $error_msg";
} else {
    // Output the response
    echo $response;
}

// Close the cURL session
curl_close($ch);
?>
