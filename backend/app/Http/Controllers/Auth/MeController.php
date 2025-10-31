<?php

namespace App\Http\Controllers\Auth;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class MeController extends Controller
{
    public function __invoke(Request $request)
    {
        $u = $request->user();
        return response()->json([
            'user' => [
                'uid'   => $u->uid,
                'name'  => $u->name,
                'email' => $u->email,
                'role'  => $u->role,
            ],
            'tenant' => $u->tenant ? [
                'uid'  => $u->tenant->uid,
                'name' => $u->tenant->name,
                'slug' => $u->tenant->slug ?? null,
            ] : null,
        ]);
    }
}
