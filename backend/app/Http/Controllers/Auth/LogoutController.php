<?php

namespace App\Http\Controllers\Auth;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class LogoutController extends Controller
{
    public function destroy(Request $request)
    {
        // Revoke current token
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }
}
