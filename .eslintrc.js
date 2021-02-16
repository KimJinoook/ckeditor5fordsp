/**
 * @license Copyright (c) 2003-2021, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* eslint-env node */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const dllPackages = fs.readdirSync( path.join( __dirname, 'src' ) ).map( directory => directory.replace( /\.js$/, '' ) );

module.exports = {
	extends: 'ckeditor5',
	settings: {
		dllPackages
	},
	rules: {
		'ckeditor5-rules/ckeditor-imports': 'error'
	},
	overrides: [
		{
			files: [ '**/tests/**/*.js' ],
			rules: {
				'no-unused-expressions': 'off',
				'ckeditor5-rules/ckeditor-imports': 'off'
			}
		},
		{
			files: [ '**/docs/**/*.js' ],
			rules: {
				'ckeditor5-rules/ckeditor-imports': 'off'
			}
		}
	]
};
