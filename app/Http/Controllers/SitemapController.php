<?php

namespace App\Http\Controllers;

use App\Models\BlogPost;
use App\Models\Country;
use App\Models\Page;
use App\Models\PageRevision;
use App\Models\Service;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Schema;

class SitemapController extends Controller
{
    public function index(): Response
    {
        $baseUrl = rtrim(config('app.url'), '/');

        $urls = [
            ['loc' => '/'],
            ['loc' => '/about'],
            ['loc' => '/contact'],
            ['loc' => '/locations'],
            ['loc' => '/services'],
            ['loc' => '/blog'],
            ['loc' => '/resources'],
            ['loc' => '/resources/brochures'],
            ['loc' => '/resources/webinars'],
            ['loc' => '/resources/books'],
        ];

        if (Schema::hasTable('pages') && Schema::hasTable('page_revisions')) {
            // A block page counts as published once it has ever had a
            // published revision (see PageController::isPublished()) — Home
            // is listed above via '/' and excluded here to avoid a duplicate.
            $publishedPageIds = PageRevision::query()->where('status', 'published')->distinct()->pluck('page_id');
            foreach (Page::where('kind', Page::KIND_BLOCK)->where('slug', '!=', 'home')->whereIn('id', $publishedPageIds)->get(['slug', 'updated_at']) as $page) {
                $urls[] = ['loc' => '/'.$page->slug, 'lastmod' => $page->updated_at];
            }
        }

        if (Schema::hasTable('services')) {
            foreach (Service::where('status', 'published')->get(['slug', 'updated_at']) as $service) {
                $urls[] = ['loc' => '/services/'.$service->slug, 'lastmod' => $service->updated_at];
            }
        }

        if (Schema::hasTable('countries')) {
            // CMS-04: only published countries have a working public detail
            // route (LocationsController::showCountry() now filters the
            // same way) — listing a draft/archived one here would be a
            // sitemap entry that 404s.
            foreach (Country::publiclyVisible()->get(['slug', 'updated_at']) as $country) {
                $urls[] = ['loc' => '/locations/'.$country->slug, 'lastmod' => $country->updated_at];
            }
        }

        if (Schema::hasTable('blog_posts')) {
            foreach (BlogPost::publiclyVisible()->get(['slug', 'updated_at']) as $post) {
                $urls[] = ['loc' => '/blog/'.$post->slug, 'lastmod' => $post->updated_at];
            }
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

        foreach ($urls as $url) {
            $xml .= '  <url>'."\n";
            $xml .= '    <loc>'.e($baseUrl.$url['loc']).'</loc>'."\n";
            if (! empty($url['lastmod'])) {
                $xml .= '    <lastmod>'.$url['lastmod']->toAtomString().'</lastmod>'."\n";
            }
            $xml .= '  </url>'."\n";
        }

        $xml .= '</urlset>';

        return response($xml, 200)->header('Content-Type', 'application/xml');
    }
}
