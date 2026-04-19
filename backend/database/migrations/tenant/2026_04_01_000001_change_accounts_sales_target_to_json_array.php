<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            $col = DB::selectOne("
                SELECT udt_name
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'accounts'
                  AND column_name = 'sales_target'
            ");
            $udt = $col->udt_name ?? '';

            if ($udt === 'json') {
                DB::statement('ALTER TABLE accounts ALTER COLUMN sales_target TYPE jsonb USING sales_target::jsonb');

                return;
            }

            if ($udt === 'jsonb') {
                return;
            }

            // Legacy varchar/text: single value -> JSON array
            DB::statement("
                ALTER TABLE accounts
                ALTER COLUMN sales_target TYPE jsonb
                USING (
                    CASE
                        WHEN sales_target IS NULL OR btrim(sales_target::text) = '' THEN NULL::jsonb
                        ELSE jsonb_build_array(btrim(sales_target::text))
                    END
                )
            ");

            return;
        }

        if ($driver === 'sqlite') {
            $rows = DB::table('accounts')->select('id', 'sales_target')->get();
            foreach ($rows as $row) {
                $raw = $row->sales_target;
                if ($raw === null || $raw === '') {
                    continue;
                }
                $trimmed = trim((string) $raw);
                if ($trimmed === '') {
                    DB::table('accounts')->where('id', $row->id)->update(['sales_target' => null]);

                    continue;
                }
                if (str_starts_with($trimmed, '[')) {
                    continue;
                }
                DB::table('accounts')->where('id', $row->id)->update([
                    'sales_target' => json_encode([$trimmed], JSON_UNESCAPED_UNICODE),
                ]);
            }
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("
                ALTER TABLE accounts
                ALTER COLUMN sales_target TYPE varchar(255)
                USING (
                    CASE
                        WHEN sales_target IS NULL THEN NULL::varchar
                        WHEN jsonb_typeof(sales_target) = 'array' AND jsonb_array_length(sales_target) > 0
                            THEN (sales_target->>0)::varchar(255)
                        ELSE NULL::varchar
                    END
                )
            ");

            return;
        }

        if ($driver === 'sqlite') {
            $rows = DB::table('accounts')->select('id', 'sales_target')->get();
            foreach ($rows as $row) {
                $raw = $row->sales_target;
                if ($raw === null || $raw === '') {
                    continue;
                }
                $decoded = json_decode((string) $raw, true);
                if (is_array($decoded) && count($decoded) > 0) {
                    DB::table('accounts')->where('id', $row->id)->update([
                        'sales_target' => (string) $decoded[0],
                    ]);
                }
            }
        }
    }
};
