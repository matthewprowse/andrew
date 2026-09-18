<?php

namespace Tests\Unit;

use App\Services\GeoIpResolver;
use Tests\TestCase;

class GeoIpResolverTest extends TestCase
{
    public function test_private_and_loopback_ips_resolve_to_nulls(): void
    {
        $resolver = new GeoIpResolver;

        $this->assertSame(
            ['country' => null, 'city' => null],
            $resolver->resolve('127.0.0.1'),
        );
        $this->assertSame(
            ['country' => null, 'city' => null],
            $resolver->resolve('192.168.1.1'),
        );
    }

    public function test_null_ip_resolves_to_nulls(): void
    {
        $resolver = new GeoIpResolver;

        $this->assertSame(
            ['country' => null, 'city' => null],
            $resolver->resolve(null),
        );
    }

    public function test_missing_database_file_resolves_to_nulls_instead_of_throwing(): void
    {
        config(['analytics.geoip_database_path' => '/nonexistent/path/to.mmdb']);

        $resolver = new GeoIpResolver;

        $this->assertSame(
            ['country' => null, 'city' => null],
            $resolver->resolve('8.8.8.8'),
        );
    }
}
