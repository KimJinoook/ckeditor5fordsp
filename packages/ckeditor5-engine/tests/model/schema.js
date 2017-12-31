/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import Schema, { SchemaContext } from '../../src/model/schema';

import CKEditorError from '@ckeditor/ckeditor5-utils/src/ckeditorerror';

import Model from '../../src/model/model';

import Element from '../../src/model/element';
import Text from '../../src/model/text';
import TextProxy from '../../src/model/textproxy';
import Position from '../../src/model/position';
import Range from '../../src/model/range';
import Selection from '../../src/model/selection';

import { setData, getData, stringify } from '../../src/dev-utils/model';

import AttributeDelta from '../../src/model/delta/attributedelta';

describe( 'Schema', () => {
	let schema, root1, r1p1, r1p2, r1bQ, r1bQp, root2;

	beforeEach( () => {
		schema = new Schema();

		root1 = new Element( '$root', null, [
			new Element( 'paragraph', null, 'foo' ),
			new Element( 'paragraph', { align: 'right' }, 'bar' ),
			new Element( 'blockQuote', null, [
				new Element( 'paragraph', null, 'foo' )
			] )
		] );
		r1p1 = root1.getChild( 0 );
		r1p2 = root1.getChild( 1 );
		r1bQ = root1.getChild( 2 );
		r1bQp = r1bQ.getChild( 0 );

		root2 = new Element( '$root2' );
	} );

	describe( 'register()', () => {
		it( 'allows registering an item', () => {
			schema.register( 'foo' );

			expect( schema.getRule( 'foo' ) ).to.be.an( 'object' );
		} );

		it( 'copies rules', () => {
			const rules = {};

			schema.register( 'foo', rules );

			rules.isBlock = true;

			expect( schema.getRules().foo ).to.not.have.property( 'isBlock' );
		} );

		it( 'throws when trying to register for a single item twice', () => {
			schema.register( 'foo' );

			expect( () => {
				schema.register( 'foo' );
			} ).to.throw( CKEditorError, /^schema-cannot-register-item-twice:/ );
		} );
	} );

	describe( 'extend()', () => {
		it( 'allows extending item\'s rules', () => {
			schema.register( 'foo' );

			schema.extend( 'foo', {
				isBlock: true
			} );

			expect( schema.getRule( 'foo' ) ).to.have.property( 'isBlock', true );
		} );

		it( 'copies rules', () => {
			schema.register( 'foo', {} );

			const rules = {};
			schema.extend( 'foo', rules );

			rules.isBlock = true;

			expect( schema.getRules().foo ).to.not.have.property( 'isBlock' );
		} );

		it( 'throws when trying to extend a not yet registered item', () => {
			expect( () => {
				schema.extend( 'foo' );
			} ).to.throw( CKEditorError, /^schema-cannot-extend-missing-item:/ );
		} );
	} );

	describe( 'getRules()', () => {
		it( 'returns compiled rules', () => {
			schema.register( '$root' );

			schema.register( 'foo', {
				allowIn: '$root'
			} );

			schema.extend( 'foo', {
				isBlock: true
			} );

			const rules = schema.getRules();

			expect( rules.foo ).to.deep.equal( {
				name: 'foo',
				allowIn: [ '$root' ],
				allowAttributes: [],
				isBlock: true
			} );
		} );

		it( 'copies all is* types', () => {
			schema.register( 'foo', {
				isBlock: true,
				isFoo: true
			} );

			schema.extend( 'foo', {
				isBar: true,
				isFoo: false // Just to check that the last one wins.
			} );

			const rules = schema.getRules();

			expect( rules.foo ).to.have.property( 'isBlock', true );
			expect( rules.foo ).to.have.property( 'isFoo', false );
			expect( rules.foo ).to.have.property( 'isBar', true );
		} );

		it( 'does not recompile rules if not needed', () => {
			schema.register( 'foo' );

			expect( schema.getRules() ).to.equal( schema.getRules() );
		} );

		it( 'ensures no duplicates in allowIn', () => {
			schema.register( '$root' );
			schema.register( 'foo', {
				allowIn: '$root'
			} );
			schema.extend( 'foo', {
				allowIn: '$root'
			} );

			const rules = schema.getRules();

			expect( rules.foo ).to.deep.equal( {
				name: 'foo',
				allowIn: [ '$root' ],
				allowAttributes: []
			} );
		} );

		it( 'ensures no unregistered items in allowIn', () => {
			schema.register( 'foo', {
				allowIn: '$root'
			} );

			const rules = schema.getRules();

			expect( rules.foo ).to.deep.equal( {
				name: 'foo',
				allowIn: [],
				allowAttributes: []
			} );
		} );

		it( 'ensures no duplicates in allowAttributes', () => {
			schema.register( 'paragraph', {
				allowAttributes: 'foo'
			} );
			schema.extend( 'paragraph', {
				allowAttributes: 'foo'
			} );

			const rules = schema.getRules();

			expect( rules.paragraph ).to.deep.equal( {
				name: 'paragraph',
				allowIn: [],
				allowAttributes: [ 'foo' ]
			} );
		} );

		it( 'ensures no duplicates in allowAttributes duplicated by allowAttributesOf', () => {
			schema.register( 'paragraph', {
				allowAttributes: 'foo',
				allowAttributesOf: '$block'
			} );
			schema.register( '$block', {
				allowAttributes: 'foo'
			} );

			const rules = schema.getRules();

			expect( rules.paragraph ).to.deep.equal( {
				name: 'paragraph',
				allowIn: [],
				allowAttributes: [ 'foo' ]
			} );
		} );
	} );

	describe( 'getRule()', () => {
		// TODO
	} );

	describe( 'isRegistered()', () => {
		it( 'returns true if an item was registered', () => {
			schema.register( 'foo' );

			expect( schema.isRegistered( 'foo' ) ).to.be.true;
		} );

		it( 'returns false if an item was not registered', () => {
			expect( schema.isRegistered( 'foo' ) ).to.be.false;
		} );
	} );

	describe( 'isBlock()', () => {
		it( 'returns true if an item was registered as a block', () => {
			schema.register( 'foo', {
				isBlock: true
			} );

			expect( schema.isBlock( 'foo' ) ).to.be.true;
		} );

		it( 'returns false if an item was not registered as a block', () => {
			schema.register( 'foo' );

			expect( schema.isBlock( 'foo' ) ).to.be.false;
		} );

		it( 'returns false if an item was not registered at all', () => {
			expect( schema.isBlock( 'foo' ) ).to.be.false;
		} );
	} );

	describe( 'isLimit()', () => {
		it( 'returns true if an item was registered as a limit element', () => {
			schema.register( 'foo', {
				isLimit: true
			} );

			expect( schema.isLimit( 'foo' ) ).to.be.true;
		} );

		it( 'returns false if an item was not registered as a limit element', () => {
			schema.register( 'foo' );

			expect( schema.isLimit( 'foo' ) ).to.be.false;
		} );

		it( 'returns false if an item was not registered at all', () => {
			expect( schema.isLimit( 'foo' ) ).to.be.false;
		} );
	} );

	describe( 'isObject()', () => {
		it( 'returns true if an item was registered as an object', () => {
			schema.register( 'foo', {
				isObject: true
			} );

			expect( schema.isObject( 'foo' ) ).to.be.true;
		} );

		it( 'returns false if an item was not registered as an object', () => {
			schema.register( 'foo' );

			expect( schema.isObject( 'foo' ) ).to.be.false;
		} );

		it( 'returns false if an item was not registered at all', () => {
			expect( schema.isObject( 'foo' ) ).to.be.false;
		} );
	} );

	describe( 'checkChild()', () => {
		beforeEach( () => {
			schema.register( '$root' );
			schema.register( 'paragraph', {
				allowIn: '$root'
			} );
			schema.register( '$text', {
				allowIn: 'paragraph'
			} );
		} );

		it( 'accepts an element as a context and a node name as a child', () => {
			expect( schema.checkChild( root1, 'paragraph' ) ).to.be.true;
			expect( schema.checkChild( root1, '$text' ) ).to.be.false;
		} );

		it( 'accepts a position as a context', () => {
			const posInRoot = Position.createAt( root1 );
			const posInParagraph = Position.createAt( r1p1 );

			expect( schema.checkChild( posInRoot, 'paragraph' ) ).to.be.true;
			expect( schema.checkChild( posInRoot, '$text' ) ).to.be.false;

			expect( schema.checkChild( posInParagraph, '$text' ) ).to.be.true;
			expect( schema.checkChild( posInParagraph, 'paragraph' ) ).to.be.false;
		} );

		// This is a temporary feature which is needed to make the current V->M conversion works.
		// It should be removed once V->M conversion uses real positions.
		// Of course, real positions have this advantage that we know element attributes at this point.
		it( 'accepts an array of element names as a context', () => {
			const contextInRoot = [ '$root' ];
			const contextInParagraph = [ '$root', 'paragraph' ];

			expect( schema.checkChild( contextInRoot, 'paragraph' ) ).to.be.true;
			expect( schema.checkChild( contextInRoot, '$text' ) ).to.be.false;

			expect( schema.checkChild( contextInParagraph, '$text' ) ).to.be.true;
			expect( schema.checkChild( contextInParagraph, 'paragraph' ) ).to.be.false;
		} );

		it( 'accepts an array of elements as a context', () => {
			const contextInRoot = [ root1 ];
			const contextInParagraph = [ root1, r1p1 ];

			expect( schema.checkChild( contextInRoot, 'paragraph' ) ).to.be.true;
			expect( schema.checkChild( contextInRoot, '$text' ) ).to.be.false;

			expect( schema.checkChild( contextInParagraph, '$text' ) ).to.be.true;
			expect( schema.checkChild( contextInParagraph, 'paragraph' ) ).to.be.false;
		} );

		// Again, this is needed temporarily to handle current V->M conversion
		it( 'accepts a mixed array of elements and strings as a context', () => {
			const contextInParagraph = [ '$root', r1p1 ];

			expect( schema.checkChild( contextInParagraph, '$text' ) ).to.be.true;
			expect( schema.checkChild( contextInParagraph, 'paragraph' ) ).to.be.false;
		} );

		it( 'accepts a node as a child', () => {
			expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			expect( schema.checkChild( root1, new Text( 'foo' ) ) ).to.be.false;
		} );

		// TODO checks fires event
		// TODO checks with a custom context array
	} );

	describe( 'checkAttribute()', () => {
		beforeEach( () => {
			schema.register( 'paragraph', {
				allowAttributes: 'align'
			} );
			schema.register( '$text', {
				allowAttributes: 'bold'
			} );
		} );

		it( 'accepts an element as a context', () => {
			expect( schema.checkAttribute( r1p1, 'align' ) ).to.be.true;
			expect( schema.checkAttribute( r1p1, 'bold' ) ).to.be.false;
		} );

		it( 'accepts a text as a context', () => {
			expect( schema.checkAttribute( new Text( 'foo' ), 'bold' ) ).to.be.true;
			expect( schema.checkAttribute( new Text( 'foo' ), 'align' ) ).to.be.false;
		} );

		// TODO checks fires event
		// TODO checks with a custom context array
	} );

	describe( 'getLimitElement()', () => {
		let model, doc, root;

		beforeEach( () => {
			model = new Model();
			doc = model.document;
			schema = model.schema;
			root = doc.createRoot();

			schema.register( 'div', {
				inheritAllFrom: '$block'
			} );
			schema.register( 'article', {
				inheritAllFrom: '$block',
				allowIn: 'section'
			} );
			schema.register( 'section', {
				inheritAllFrom: '$block',
				allowIn: 'div'
			} );
			schema.register( 'paragraph', {
				inheritAllFrom: '$block',
				allowIn: 'article'
			} );
			schema.register( 'widget', {
				inheritAllFrom: '$block',
				allowIn: 'div'
			} );
			schema.register( 'image', {
				inheritAllFrom: '$block',
				allowIn: 'widget'
			} );
			schema.register( 'caption', {
				inheritAllFrom: '$block',
				allowIn: 'image'
			} );
		} );

		it( 'always returns $root element if any other limit was not defined', () => {
			schema.extend( '$root', {
				isLimit: false
			} );
			expect( schema.isLimit( '$root' ) ).to.be.false;

			setData( model, '<div><section><article><paragraph>foo[]bar</paragraph></article></section></div>' );
			expect( schema.getLimitElement( doc.selection ) ).to.equal( root );
		} );

		it( 'returns the limit element which is the closest element to common ancestor for collapsed selection', () => {
			schema.extend( 'article', { isLimit: true } );
			schema.extend( 'section', { isLimit: true } );

			setData( model, '<div><section><article><paragraph>foo[]bar</paragraph></article></section></div>' );

			const article = root.getNodeByPath( [ 0, 0, 0 ] );

			expect( schema.getLimitElement( doc.selection ) ).to.equal( article );
		} );

		it( 'returns the limit element which is the closest element to common ancestor for non-collapsed selection', () => {
			schema.extend( 'article', { isLimit: true } );
			schema.extend( 'section', { isLimit: true } );

			setData( model, '<div><section><article>[foo</article><article>bar]</article></section></div>' );

			const section = root.getNodeByPath( [ 0, 0 ] );

			expect( schema.getLimitElement( doc.selection ) ).to.equal( section );
		} );

		it( 'works fine with multi-range selections', () => {
			schema.extend( 'article', { isLimit: true } );
			schema.extend( 'widget', { isLimit: true } );
			schema.extend( 'div', { isLimit: true } );

			setData(
				model,
				'<div>' +
					'<section>' +
						'<article>' +
							'<paragraph>[foo]</paragraph>' +
						'</article>' +
					'</section>' +
					'<widget>' +
						'<image>' +
							'<caption>b[a]r</caption>' +
						'</image>' +
					'</widget>' +
				'</div>'
			);

			const div = root.getNodeByPath( [ 0 ] );
			expect( schema.getLimitElement( doc.selection ) ).to.equal( div );
		} );

		it( 'works fine with multi-range selections even if limit elements are not defined', () => {
			setData(
				model,
				'<div>' +
					'<section>' +
						'<article>' +
							'<paragraph>[foo]</paragraph>' +
						'</article>' +
					'</section>' +
				'</div>' +
				'<section>b[]ar</section>'
			);

			expect( schema.getLimitElement( doc.selection ) ).to.equal( root );
		} );
	} );

	describe( 'checkAttributeInSelection()', () => {
		const attribute = 'bold';
		let model, doc, schema;

		beforeEach( () => {
			model = new Model();
			doc = model.document;
			doc.createRoot();

			schema = model.schema;

			schema.register( 'p', { inheritAllFrom: '$block' } );
			schema.register( 'h1', { inheritAllFrom: '$block' } );
			schema.register( 'img', { allowWhere: '$text' } );
			schema.register( 'figure', {
				allowIn: '$root',
				allowAttributes: [ 'name', 'title' ]
			} );

			schema.on( 'checkAttribute', ( evt, args ) => {
				const ctx = args[ 0 ];
				const attributeName = args[ 1 ];

				// Allow 'bold' on p>$text.
				if ( ctx.matchEnd( 'p $text' ) && attributeName == 'bold' ) {
					evt.stop();
					evt.return = true;
				}

				// Allow 'bold' on $root>p.
				if ( ctx.matchEnd( '$root p' ) && attributeName == 'bold' ) {
					evt.stop();
					evt.return = true;
				}
			}, { priority: 'high' } );
		} );

		describe( 'when selection is collapsed', () => {
			it( 'should return true if characters with the attribute can be placed at caret position', () => {
				setData( model, '<p>f[]oo</p>' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.true;
			} );

			it( 'should return false if characters with the attribute cannot be placed at caret position', () => {
				setData( model, '<h1>[]</h1>' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.false;

				setData( model, '[]' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.false;
			} );
		} );

		describe( 'when selection is not collapsed', () => {
			it( 'should return true if there is at least one node in selection that can have the attribute', () => {
				// Simple selection on a few characters.
				setData( model, '<p>[foo]</p>' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.true;

				// Selection spans over characters but also include nodes that can't have attribute.
				setData( model, '<p>fo[o<img />b]ar</p>' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.true;

				// Selection on whole root content. Characters in P can have an attribute so it's valid.
				setData( model, '[<p>foo<img />bar</p><h1></h1>]' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.true;

				// Selection on empty P. P can have the attribute.
				setData( model, '[<p></p>]' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.true;
			} );

			it( 'should return false if there are no nodes in selection that can have the attribute', () => {
				// Selection on DIV which can't have bold text.
				setData( model, '[<h1></h1>]' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.false;

				// Selection on two images which can't be bold.
				setData( model, '<p>foo[<img /><img />]bar</p>' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.false;
			} );

			it( 'should return true when checking element with required attribute', () => {
				setData( model, '[<figure name="figure"></figure>]' );
				expect( schema.checkAttributeInSelection( doc.selection, 'title' ) ).to.be.true;
			} );

			it( 'should return true when checking element when attribute is already present', () => {
				setData( model, '[<figure name="figure" title="title"></figure>]' );
				expect( schema.checkAttributeInSelection( doc.selection, 'title' ) ).to.be.true;
			} );
		} );
	} );

	describe( 'getValidRanges()', () => {
		const attribute = 'bold';
		let model, doc, root, schema, ranges;

		beforeEach( () => {
			model = new Model();
			doc = model.document;
			schema = model.schema;
			root = doc.createRoot();

			schema.register( 'p', { inheritAllFrom: '$block' } );
			schema.register( 'h1', { inheritAllFrom: '$block' } );
			schema.register( 'img', {
				allowWhere: '$text'
			} );

			schema.on( 'checkAttribute', ( evt, args ) => {
				const ctx = args[ 0 ];
				const attributeName = args[ 1 ];

				// Allow 'bold' on p>$text.
				if ( ctx.matchEnd( 'p $text' ) && attributeName == 'bold' ) {
					evt.stop();
					evt.return = true;
				}

				// Allow 'bold' on $root>p.
				if ( ctx.matchEnd( '$root p' ) && attributeName == 'bold' ) {
					evt.stop();
					evt.return = true;
				}
			}, { priority: 'high' } );

			setData( model, '<p>foo<img />bar</p>' );

			ranges = [ Range.createOn( root.getChild( 0 ) ) ];
		} );

		it( 'should return unmodified ranges when attribute is allowed on each item (text is not allowed in img)', () => {
			schema.extend( 'img', { allowAttributes: 'bold' } );

			expect( schema.getValidRanges( ranges, attribute ) ).to.deep.equal( ranges );
		} );

		it( 'should return unmodified ranges when attribute is allowed on each item (text is allowed in img)', () => {
			schema.extend( 'img', { allowAttributes: 'bold' } );
			schema.extend( '$text', { allowIn: 'img' } );

			expect( schema.getValidRanges( ranges, attribute ) ).to.deep.equal( ranges );
		} );

		it( 'should return two ranges when attribute is not allowed on one item', () => {
			schema.extend( 'img', { allowAttributes: 'bold' } );
			schema.extend( '$text', { allowIn: 'img' } );

			setData( model, '[<p>foo<img>xxx</img>bar</p>]' );

			const validRanges = schema.getValidRanges( doc.selection.getRanges(), attribute );
			const sel = new Selection();
			sel.setRanges( validRanges );

			expect( stringify( root, sel ) ).to.equal( '[<p>foo<img>]xxx[</img>bar</p>]' );
		} );

		it( 'should return three ranges when attribute is not allowed on one element but is allowed on its child', () => {
			schema.extend( '$text', { allowIn: 'img' } );

			schema.on( 'checkAttribute', ( evt, args ) => {
				const ctx = args[ 0 ];
				const attributeName = args[ 1 ];

				// Allow 'bold' on img>$text.
				if ( ctx.matchEnd( 'img $text' ) && attributeName == 'bold' ) {
					evt.stop();
					evt.return = true;
				}
			}, { priority: 'high' } );

			setData( model, '[<p>foo<img>xxx</img>bar</p>]' );

			const validRanges = schema.getValidRanges( doc.selection.getRanges(), attribute );
			const sel = new Selection();
			sel.setRanges( validRanges );

			expect( stringify( root, sel ) ).to.equal( '[<p>foo]<img>[xxx]</img>[bar</p>]' );
		} );

		it( 'should not leak beyond the given ranges', () => {
			setData( model, '<p>[foo<img></img>bar]x[bar<img></img>foo]</p>' );

			const validRanges = schema.getValidRanges( doc.selection.getRanges(), attribute );
			const sel = new Selection();
			sel.setRanges( validRanges );

			expect( stringify( root, sel ) ).to.equal( '<p>[foo]<img></img>[bar]x[bar]<img></img>[foo]</p>' );
		} );

		it( 'should correctly handle a range which ends in a disallowed position', () => {
			schema.extend( '$text', { allowIn: 'img' } );

			setData( model, '<p>[foo<img>bar]</img>bom</p>' );

			const validRanges = schema.getValidRanges( doc.selection.getRanges(), attribute );
			const sel = new Selection();
			sel.setRanges( validRanges );

			expect( stringify( root, sel ) ).to.equal( '<p>[foo]<img>bar</img>bom</p>' );
		} );

		it( 'should split range into two ranges and omit disallowed element', () => {
			schema.on( 'checkAttribute', ( evt, args ) => {
				const ctx = args[ 0 ];
				const attributeName = args[ 1 ];

				// Disallow 'bold' on p>img.
				if ( ctx.matchEnd( 'p img' ) && attributeName == 'bold' ) {
					evt.stop();
					evt.return = false;
				}
			}, { priority: 'high' } );

			const result = schema.getValidRanges( ranges, attribute );

			expect( result ).to.length( 2 );
			expect( result[ 0 ].start.path ).to.members( [ 0 ] );
			expect( result[ 0 ].end.path ).to.members( [ 0, 3 ] );
			expect( result[ 1 ].start.path ).to.members( [ 0, 4 ] );
			expect( result[ 1 ].end.path ).to.members( [ 1 ] );
		} );
	} );

	describe( 'removeDisallowedAttributes()', () => {
		let model, doc, root;

		beforeEach( () => {
			model = new Model();
			doc = model.document;
			root = doc.createRoot();
			schema = model.schema;

			schema.register( 'paragraph', {
				inheritAllFrom: '$block'
			} );
			schema.register( 'div', {
				inheritAllFrom: '$block'
			} );
			schema.register( 'image', {
				isObject: true
			} );
			schema.extend( '$block', {
				allowIn: 'div'
			} );
		} );

		it( 'should filter out disallowed attributes from given nodes', () => {
			schema.extend( '$text', { allowAttributes: 'a' } );
			schema.extend( 'image', { allowAttributes: 'b' } );

			const text = new Text( 'foo', { a: 1, b: 1 } );
			const image = new Element( 'image', { a: 1, b: 1 } );

			root.appendChildren( [ text, image ] );

			model.change( writer => {
				schema.removeDisallowedAttributes( root.getChildren(), writer );

				expect( Array.from( text.getAttributeKeys() ) ).to.deep.equal( [ 'a' ] );
				expect( Array.from( image.getAttributeKeys() ) ).to.deep.equal( [ 'b' ] );

				expect( writer.batch.deltas ).to.length( 2 );
				expect( writer.batch.deltas[ 0 ] ).to.instanceof( AttributeDelta );
				expect( writer.batch.deltas[ 1 ] ).to.instanceof( AttributeDelta );

				expect( getData( model, { withoutSelection: true } ) )
					.to.equal( '<$text a="1">foo</$text><image b="1"></image>' );
			} );
		} );

		it( 'should filter out disallowed attributes from all descendants of given nodes', () => {
			schema.on( 'checkAttribute', ( evt, args ) => {
				const ctx = args[ 0 ];
				const attributeName = args[ 1 ];

				// Allow 'a' on div>$text.
				if ( ctx.matchEnd( 'div $text' ) && attributeName == 'a' ) {
					evt.stop();
					evt.return = true;
				}

				// Allow 'b' on div>paragraph>$text.
				if ( ctx.matchEnd( 'div paragraph $text' ) && attributeName == 'b' ) {
					evt.stop();
					evt.return = true;
				}

				// Allow 'a' on div>image.
				if ( ctx.matchEnd( 'div image' ) && attributeName == 'a' ) {
					evt.stop();
					evt.return = true;
				}

				// Allow 'b' on div>paragraph>image.
				if ( ctx.matchEnd( 'div paragraph image' ) && attributeName == 'b' ) {
					evt.stop();
					evt.return = true;
				}
			}, { priority: 'high' } );

			const foo = new Text( 'foo', { a: 1, b: 1 } );
			const bar = new Text( 'bar', { a: 1, b: 1 } );
			const imageInDiv = new Element( 'image', { a: 1, b: 1 } );
			const imageInParagraph = new Element( 'image', { a: 1, b: 1 } );
			const paragraph = new Element( 'paragraph', [], [ foo, imageInParagraph ] );
			const div = new Element( 'div', [], [ paragraph, bar, imageInDiv ] );

			root.appendChildren( [ div ] );

			model.change( writer => {
				schema.removeDisallowedAttributes( root.getChildren(), writer );

				expect( writer.batch.deltas ).to.length( 4 );
				expect( writer.batch.deltas[ 0 ] ).to.instanceof( AttributeDelta );
				expect( writer.batch.deltas[ 1 ] ).to.instanceof( AttributeDelta );
				expect( writer.batch.deltas[ 2 ] ).to.instanceof( AttributeDelta );
				expect( writer.batch.deltas[ 3 ] ).to.instanceof( AttributeDelta );

				expect( getData( model, { withoutSelection: true } ) )
					.to.equal(
						'<div>' +
							'<paragraph>' +
								'<$text b="1">foo</$text>' +
								'<image b="1"></image>' +
							'</paragraph>' +
							'<$text a="1">bar</$text>' +
							'<image a="1"></image>' +
						'</div>'
					);
			} );
		} );
	} );

	describe( 'rules compilation', () => {
		describe( 'allowIn cases', () => {
			it( 'passes $root>paragraph', () => {
				schema.register( '$root' );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			} );

			it( 'passes $root>paragraph and $root2>paragraph – support for array values', () => {
				schema.register( '$root' );
				schema.register( '$root2' );
				schema.register( 'paragraph', {
					allowIn: [ '$root', '$root2' ]
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
				expect( schema.checkChild( root2, r1p1 ) ).to.be.true;
			} );

			it( 'passes $root>paragraph[align] – attributes does not matter', () => {
				schema.register( '$root' );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( root1, r1p2 ) ).to.be.true;
			} );

			it( 'passes $root>div>div – in case of circular refs', () => {
				schema.register( '$root' );
				schema.register( 'div', {
					allowIn: [ '$root', 'div' ]
				} );

				const div = new Element( 'div' );
				root1.appendChildren( div );

				const div2 = new Element( 'div' );

				expect( schema.checkChild( div, div2 ) ).to.be.true;
			} );

			it( 'passes $root>div>div – in case of circular refs, when div1==div2', () => {
				schema.register( '$root' );
				schema.register( 'div', {
					allowIn: [ '$root', 'div' ]
				} );

				const div = new Element( 'div' );
				root1.appendChildren( div );

				expect( schema.checkChild( div, div ) ).to.be.true;
			} );

			it( 'rejects $root>paragraph – unregistered paragraph', () => {
				schema.register( '$root' );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.false;
			} );

			it( 'rejects $root>paragraph – registered different item', () => {
				schema.register( '$root' );
				schema.register( 'paragraph' );
				schema.register( 'listItem', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.false;
			} );

			it( 'rejects $root>paragraph – paragraph allowed in different context', () => {
				schema.register( '$root' );
				schema.register( '$fancyRoot' );
				schema.register( 'paragraph', {
					allowIn: '$fancyRoot'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.false;
			} );

			it( 'rejects $root>blockQuote>paragraph – since paragraph is only allowed in $root', () => {
				schema.register( '$root' );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( r1bQ, r1bQp ) ).to.be.false;
			} );

			it( 'rejects $root>blockQuote>paragraph – since paragraph is only allowed in $root v2', () => {
				schema.register( '$root' );
				schema.register( 'blockQuote', {
					allowIn: '$root'
				} );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( r1bQ, r1bQp ) ).to.be.false;
			} );

			it( 'rejects $root>blockQuote>paragraph>$text - since paragraph is not allowed in blockQuote', () => {
				schema.register( '$root' );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );
				schema.register( '$text', {
					allowIn: 'paragraph'
				} );

				expect( schema.checkChild( root1, r1bQp.getChild( 0 ) ) ).to.be.false;
			} );

			it( 'rejects $root>blockQuote>paragraph>$text - since blockQuote is not allowed in $root', () => {
				schema.register( '$root' );
				schema.register( 'blockQuote' );
				schema.register( 'paragraph', {
					allowIn: [ 'blockQuote', '$root' ]
				} );
				schema.register( '$text', {
					allowIn: 'paragraph'
				} );

				expect( schema.checkChild( root1, r1bQp.getChild( 0 ) ) ).to.be.false;
			} );
		} );

		describe( 'allowWhere cases', () => {
			it( 'passes $root>paragraph – paragraph inherits from $block', () => {
				schema.register( '$root' );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( 'paragraph', {
					allowWhere: '$block'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			} );

			it( 'supports the array syntax', () => {
				schema.register( '$root' );
				schema.register( '$root2' );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( '$block2', {
					allowIn: '$root2'
				} );
				schema.register( 'paragraph', {
					allowWhere: [ '$block', '$block2' ]
				} );

				expect( schema.checkChild( root1, r1p1 ), '$root' ).to.be.true;
				expect( schema.checkChild( root2, r1p1 ), '$root2' ).to.be.true;
			} );

			// This checks if some inapropriate caching or preprocessing isn't applied by register().
			it( 'passes $root>paragraph – paragraph inherits from $block, order of rules does not matter', () => {
				schema.register( '$root' );
				schema.register( 'paragraph', {
					allowWhere: '$block'
				} );
				schema.register( '$block', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			} );

			it( 'passes $root>paragraph – paragraph inherits from $specialBlock which inherits from $block', () => {
				schema.register( '$root' );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( '$specialBlock', {
					allowWhere: '$block'
				} );
				schema.register( 'paragraph', {
					allowWhere: '$specialBlock'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			} );

			it( 'rejects $root>paragraph – paragraph inherits from $block but $block is not allowed in $root', () => {
				schema.register( '$root' );
				schema.register( '$block' );
				schema.register( 'paragraph', {
					allowWhere: '$block'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.false;
			} );

			it( 'rejects $root>paragraph>$text – paragraph inherits from $block but $block is not allowed in $root', () => {
				schema.register( '$root' );
				schema.register( '$block' );
				schema.register( 'paragraph', {
					allowWhere: '$block'
				} );
				schema.register( '$text', {
					allowIn: 'paragraph'
				} );

				expect( schema.checkChild( root1, r1p1.getChild( 0 ) ) ).to.be.false;
			} );
		} );

		describe( 'allowContentOf cases', () => {
			it( 'passes $root2>paragraph – $root2 inherits from $root', () => {
				schema.register( '$root' );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );
				schema.register( '$root2', {
					allowContentOf: '$root'
				} );

				expect( schema.checkChild( root2, r1p1 ) ).to.be.true;
			} );

			it( 'supports the array syntax', () => {
				schema.register( '$root' );
				schema.register( '$root2' );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );
				schema.register( 'heading1', {
					allowIn: '$root2'
				} );
				schema.register( '$root3', {
					allowContentOf: [ '$root', '$root2' ]
				} );

				const root3 = new Element( '$root3' );
				const heading1 = new Element( 'heading1' );

				expect( schema.checkChild( root3, r1p1 ), 'paragraph' ).to.be.true;
				expect( schema.checkChild( root3, heading1 ), 'heading1' ).to.be.true;
			} );

			it( 'passes $root2>paragraph – $root2 inherits from $root, order of rules does not matter', () => {
				schema.register( '$root' );
				schema.register( '$root2', {
					allowContentOf: '$root'
				} );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( root2, r1p1 ) ).to.be.true;
			} );

			it( 'passes $root>paragraph>$text – paragraph inherits content of $block', () => {
				schema.register( '$root' );
				schema.register( '$block' );
				schema.register( 'paragraph', {
					allowIn: '$root',
					allowContentOf: '$block'
				} );
				schema.register( '$text', {
					allowIn: '$block'
				} );

				expect( schema.checkChild( r1p1, r1p1.getChild( 0 ) ) ).to.be.true;
			} );

			// TODO we need to make it possible to disallow bQ in bQ.
			it( 'passes $root>blockQuote>paragraph – blockQuote inherits content of $root', () => {
				schema.register( '$root' );
				schema.register( 'blockQuote', {
					allowIn: '$root',
					allowContentOf: '$root'
				} );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( r1bQ, r1bQp ) ).to.be.true;
			} );

			it( 'rejects $root2>paragraph – $root2 inherits from $root, but paragraph is not allowed there anyway', () => {
				schema.register( '$root' );
				schema.register( 'paragraph' );
				schema.register( '$root2', {
					allowContentOf: '$root'
				} );

				expect( schema.checkChild( root2, r1p1 ) ).to.be.false;
			} );
		} );

		describe( 'mix of allowContentOf and allowWhere', () => {
			it( 'passes $root>paragraph>$text – paragraph inherits all from $block', () => {
				schema.register( '$root' );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( 'paragraph', {
					allowContentOf: '$block',
					allowWhere: '$block'
				} );
				schema.register( '$text', {
					allowIn: '$block'
				} );

				expect( schema.checkChild( r1p1, r1p1.getChild( 0 ) ) ).to.be.true;
			} );

			it( 'passes $root>paragraph and $root2>paragraph – where $root2 inherits content of $root' +
				'and paragraph inherits allowWhere from $block', () => {
				schema.register( '$root' );
				schema.register( '$root2', {
					allowContentOf: '$root'
				} );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( 'paragraph', {
					allowWhere: '$block'
				} );

				expect( schema.checkChild( root1, 'paragraph' ), 'root1' ).to.be.true;
				expect( schema.checkChild( root2, 'paragraph' ), 'root2' ).to.be.true;
			} );

			it( 'passes d>a where d inherits content of c which inherits content of b', () => {
				schema.register( 'b' );
				schema.register( 'a', { allowIn: 'b' } );
				schema.register( 'c', { allowContentOf: 'b' } );
				schema.register( 'd', { allowContentOf: 'c' } );

				const d = new Element( 'd' );

				expect( schema.checkChild( d, 'a' ) ).to.be.true;
			} );

			// This case won't pass becuase we compile the rules in a pretty naive way.
			// To make chains like this work we'd need to repeat compilation of allowContentOf rules
			// as long as the previous iteration found something to compile.
			// This way, even though we'd not compile d<-c in the first run, we'd still find b<-c
			// and since we've found something, we'd now try d<-c which would work.
			//
			// We ignore those situations for now as they are very unlikely to happen and would
			// significantly raised the complexity of rule compilation.
			//
			// it( 'passes d>a where d inherits content of c which inherits content of b', () => {
			// 	schema.register( 'b' );
			// 	schema.register( 'a', { allowIn: 'b' } );
			// 	schema.register( 'd', { allowContentOf: 'c' } );
			// 	schema.register( 'c', { allowContentOf: 'b' } );
			//
			// 	const d = new Element( 'd' );
			//
			// 	expect( schema.checkChild( d, 'a' ) ).to.be.true;
			// } );
		} );

		describe( 'inheritTypesFrom', () => {
			it( 'inherit properties of another item', () => {
				schema.register( '$block', {
					isBlock: true,
					isLimit: true
				} );
				schema.register( 'paragraph', {
					inheritTypesFrom: '$block'
				} );

				expect( schema.getRule( 'paragraph' ).isBlock ).to.be.true;
				expect( schema.getRule( 'paragraph' ).isLimit ).to.be.true;
			} );

			it( 'inherit properties of other items – support for arrays', () => {
				schema.register( '$block', {
					isBlock: true
				} );
				schema.register( '$block2', {
					isLimit: true
				} );
				schema.register( 'paragraph', {
					inheritTypesFrom: [ '$block', '$block2' ]
				} );

				expect( schema.getRule( 'paragraph' ).isBlock ).to.be.true;
				expect( schema.getRule( 'paragraph' ).isLimit ).to.be.true;
			} );

			it( 'does not override existing props', () => {
				schema.register( '$block', {
					isBlock: true,
					isLimit: true
				} );
				schema.register( 'paragraph', {
					inheritTypesFrom: '$block',
					isLimit: false
				} );

				expect( schema.getRule( 'paragraph' ).isBlock ).to.be.true;
				expect( schema.getRule( 'paragraph' ).isLimit ).to.be.false;
			} );
		} );

		describe( 'inheritAllFrom', () => {
			it( 'passes $root>paragraph – paragraph inherits allowIn from $block', () => {
				schema.register( '$root' );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			} );

			it( 'paragraph inherit properties of $block', () => {
				schema.register( '$block', {
					isBlock: true
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.isBlock( r1p1 ) ).to.be.true;
			} );

			it( 'passes $root>paragraph>$text – paragraph inherits allowed content of $block', () => {
				schema.register( '$root' );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( '$text', {
					allowIn: '$block'
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkChild( r1p1, r1p1.getChild( 0 ) ) ).to.be.true;
			} );

			it( 'passes $root>paragraph>$text – paragraph inherits allowIn from $block through $block\'s allowWhere', () => {
				schema.register( '$root' );
				schema.register( '$blockProto', {
					allowIn: '$root'
				} );
				schema.register( '$block', {
					allowWhere: '$blockProto'
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			} );

			it( 'passes $root>paragraph>$text – paragraph inherits allowIn from $block through $block\'s allowWhere', () => {
				schema.register( '$root' );
				schema.register( '$blockProto' );
				schema.register( '$block', {
					allowContentOf: '$blockProto',
					allowIn: '$root'
				} );
				schema.register( '$text', {
					allowIn: '$blockProto'
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkChild( r1p1, r1p1.getChild( 0 ) ) ).to.be.true;
			} );
		} );

		// We need to handle cases where some independent features registered rules which might use
		// optional elements (elements which might not have been registered).
		describe( 'missing structure rules', () => {
			it( 'does not break when trying to check a child which is not registered', () => {
				schema.register( '$root' );

				expect( schema.checkChild( root1, 'foo404' ) ).to.be.false;
			} );

			it( 'does not break when trying to check registered child in a context which contains unregistered elements', () => {
				const foo404 = new Element( 'foo404' );

				root1.appendChildren( foo404 );

				schema.register( '$root' );
				schema.register( '$text', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( foo404, '$text' ) ).to.be.false;
			} );

			it( 'does not break when used allowedIn pointing to an unregistered element', () => {
				schema.register( '$root' );
				schema.register( '$text', {
					allowIn: 'foo404'
				} );

				expect( schema.checkChild( root1, '$text' ) ).to.be.false;
			} );

			it( 'does not break when used allowWhere pointing to an unregistered element', () => {
				schema.register( '$root' );
				schema.register( '$text', {
					allowWhere: 'foo404'
				} );

				expect( schema.checkChild( root1, '$text' ) ).to.be.false;
			} );

			it( 'does not break when used allowContentOf pointing to an unregistered element', () => {
				schema.register( '$root', {
					allowContentOf: 'foo404'
				} );
				schema.register( '$text', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( root1, '$text' ) ).to.be.true;
			} );

			it( 'checks whether allowIn uses a registered element', () => {
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );
				// $root isn't registered!

				expect( schema.checkChild( root1, 'paragraph' ) ).to.be.false;
			} );

			it( 'does not break when inheriting all from an unregistered element', () => {
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.false;
			} );
		} );

		describe( 'allowAttributes', () => {
			it( 'passes paragraph[align]', () => {
				schema.register( 'paragraph', {
					allowAttributes: 'align'
				} );

				expect( schema.checkAttribute( r1p1, 'align' ) ).to.be.true;
			} );

			it( 'passes paragraph[align] and paragraph[dir] – support for array values', () => {
				schema.register( 'paragraph', {
					allowAttributes: [ 'align', 'dir' ]
				} );

				expect( schema.checkAttribute( r1p1, 'align' ), 'align' ).to.be.true;
				expect( schema.checkAttribute( r1p1, 'dir' ), 'dir' ).to.be.true;
			} );

			it( 'passes paragraph>$text[bold]', () => {
				schema.register( 'paragraph' );
				schema.register( '$text', {
					allowIn: 'paragraph',
					allowAttributes: 'bold'
				} );

				expect( schema.checkAttribute( r1p1.getChild( 0 ), 'bold' ) ).to.be.true;
			} );
		} );

		describe( 'allowAttributesOf', () => {
			it( 'passes paragraph[align] – paragraph inherits from $block', () => {
				schema.register( '$block', {
					allowAttributes: 'align'
				} );
				schema.register( 'paragraph', {
					allowAttributesOf: '$block'
				} );

				expect( schema.checkAttribute( r1p1, 'align' ) ).to.be.true;
			} );

			it( 'passes paragraph[align] and paragraph[dir] – support for array values', () => {
				schema.register( '$block', {
					allowAttributes: 'align'
				} );
				schema.register( '$block2', {
					allowAttributes: 'dir'
				} );
				schema.register( 'paragraph', {
					allowAttributesOf: [ '$block', '$block2' ]
				} );

				expect( schema.checkAttribute( r1p1, 'align' ), 'align' ).to.be.true;
				expect( schema.checkAttribute( r1p1, 'dir' ), 'dir' ).to.be.true;
			} );

			it( 'passes paragraph[align] and paragraph[dir] – support for combined allowAttributes and allowAttributesOf', () => {
				schema.register( '$block', {
					allowAttributes: 'align'
				} );
				schema.register( 'paragraph', {
					allowAttributes: 'dir',
					allowAttributesOf: '$block'
				} );

				expect( schema.checkAttribute( r1p1, 'align' ), 'align' ).to.be.true;
				expect( schema.checkAttribute( r1p1, 'dir' ), 'dir' ).to.be.true;
			} );

			// The support for allowAttributesOf is broken in the similar way as for allowContentOf (see the comment above).
			// However, those situations are rather theoretical, so we're not going to waste time on them now.
		} );

		describe( 'inheritAllFrom', () => {
			it( 'passes paragraph[align] – paragraph inherits attributes of $block', () => {
				schema.register( '$block', {
					allowAttributes: 'align'
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkAttribute( r1p1, 'align' ) ).to.be.true;
			} );

			it( 'passes paragraph[align] – paragraph inherits attributes of $block through allowAttributesOf', () => {
				schema.register( '$blockProto', {
					allowAttributes: 'align'
				} );
				schema.register( '$block', {
					allowAttributesOf: '$blockProto'
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkAttribute( r1p1, 'align' ) ).to.be.true;
			} );
		} );

		describe( 'missing attribute rules', () => {
			it( 'does not crash when checking an attribute of a unregistered element', () => {
				expect( schema.checkAttribute( r1p1, 'align' ) ).to.be.false;
			} );

			it( 'does not crash when inheriting attributes of a unregistered element', () => {
				schema.register( 'paragraph', {
					allowAttributesOf: '$block'
				} );

				expect( schema.checkAttribute( r1p1, 'whatever' ) ).to.be.false;
			} );

			it( 'does not crash when inheriting all from a unregistered element', () => {
				schema.register( 'paragraph', {
					allowAttributesOf: '$block'
				} );

				expect( schema.checkAttribute( r1p1, 'whatever' ) ).to.be.false;
			} );
		} );

		describe( 'missing types rules', () => {
			it( 'does not crash when inheriting types of an unregistered element', () => {
				schema.register( 'paragraph', {
					inheritTypesFrom: '$block'
				} );

				expect( schema.getRule( 'paragraph' ) ).to.be.an( 'object' );
			} );
		} );
	} );

	describe( 'real scenarios', () => {
		let r1bQi, r1i, r1lI, r1h, r1bQlI;

		const rules = [
			() => {
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );
			},
			() => {
				schema.register( 'heading1', {
					inheritAllFrom: '$block'
				} );
			},
			() => {
				schema.register( 'listItem', {
					inheritAllFrom: '$block',
					allowAttributes: [ 'indent', 'type' ]
				} );
			},
			() => {
				schema.register( 'blockQuote', {
					allowWhere: '$block',
					allowContentOf: '$root'
				} );

				// Disallow blockQuote in blockQuote.
				schema.on( 'checkChild', ( evt, args ) => {
					const ctx = args[ 0 ];
					const child = args[ 1 ];
					const childRule = schema.getRule( child );

					if ( childRule.name == 'blockQuote' && ctx.matchEnd( 'blockQuote' ) ) {
						evt.stop();
						evt.return = false;
					}
				}, { priority: 'high' } );
			},
			() => {
				schema.register( 'image', {
					allowWhere: '$block',
					allowAttributes: [ 'src', 'alt' ],
					isObject: true,
					isBlock: true
				} );
			},
			() => {
				schema.register( 'caption', {
					allowIn: 'image',
					allowContentOf: '$block',
					isLimit: true
				} );
			},
			() => {
				schema.extend( '$text', {
					allowAttributes: [ 'bold', 'italic' ]
				} );

				// Disallow bold in heading1.
				schema.on( 'checkAttribute', ( evt, args ) => {
					const ctx = args[ 0 ];
					const attributeName = args[ 1 ];

					if ( ctx.matchEnd( 'heading1 $text' ) && attributeName == 'bold' ) {
						evt.stop();
						evt.return = false;
					}
				}, { priority: 'high' } );
			},
			() => {
				schema.extend( '$block', {
					allowAttributes: 'alignment'
				} );
			}
		];

		beforeEach( () => {
			schema.register( '$root', {
				isLimit: true
			} );
			schema.register( '$block', {
				allowIn: '$root',
				isBlock: true
			} );
			schema.register( '$text', {
				allowIn: '$block'
			} );

			for ( const rule of rules ) {
				rule();
			}

			// or...
			//
			// Use the below code to shuffle the rules.
			// Don't look here, Szymon!
			//
			// const rulesCopy = rules.slice();
			//
			// while ( rulesCopy.length ) {
			// 	const r = Math.floor( Math.random() * rulesCopy.length );
			// 	rulesCopy.splice( r, 1 )[ 0 ]();
			// }

			root1 = new Element( '$root', null, [
				new Element( 'paragraph', null, 'foo' ),
				new Element( 'paragraph', { alignment: 'right' }, 'bar' ),
				new Element( 'listItem', { type: 'x', indent: 0 }, 'foo' ),
				new Element( 'heading1', null, 'foo' ),
				new Element( 'blockQuote', null, [
					new Element( 'paragraph', null, 'foo' ),
					new Element( 'listItem', { type: 'x', indent: 0 }, 'foo' ),
					new Element( 'image', null, [
						new Element( 'caption', null, 'foo' )
					] )
				] ),
				new Element( 'image', null, [
					new Element( 'caption', null, 'foo' )
				] )
			] );
			r1p1 = root1.getChild( 0 );
			r1p2 = root1.getChild( 1 );
			r1lI = root1.getChild( 2 );
			r1h = root1.getChild( 3 );
			r1bQ = root1.getChild( 4 );
			r1i = root1.getChild( 5 );
			r1bQp = r1bQ.getChild( 0 );
			r1bQlI = r1bQ.getChild( 1 );
			r1bQi = r1bQ.getChild( 2 );
		} );

		it( 'passes $root>paragraph', () => {
			expect( schema.checkChild( root1, 'paragraph' ) ).to.be.true;
		} );

		it( 'passes $root>paragraph>$text', () => {
			expect( schema.checkChild( r1p1, '$text' ), 'paragraph' ).to.be.true;
			expect( schema.checkChild( r1p2, '$text' ), 'paragraph[alignment]' ).to.be.true;
		} );

		it( 'passes $root>listItem', () => {
			expect( schema.checkChild( root1, 'listItem' ) ).to.be.true;
		} );

		it( 'passes $root>listItem>$text', () => {
			expect( schema.checkChild( r1lI, '$text' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>paragraph', () => {
			expect( schema.checkChild( r1bQ, 'paragraph' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>paragraph>$text', () => {
			expect( schema.checkChild( r1bQp, '$text' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>listItem', () => {
			expect( schema.checkChild( r1bQ, 'listItem' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>listItem>$text', () => {
			expect( schema.checkChild( r1bQlI, '$text' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>image', () => {
			expect( schema.checkChild( r1bQ, 'image' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>image>caption', () => {
			expect( schema.checkChild( r1bQi, 'caption' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>image>caption>$text', () => {
			expect( schema.checkChild( r1bQi.getChild( 0 ), '$text' ) ).to.be.true;
		} );

		it( 'passes $root>image', () => {
			expect( schema.checkChild( root1, 'image' ) ).to.be.true;
		} );

		it( 'passes $root>image>caption', () => {
			expect( schema.checkChild( r1i, 'caption' ) ).to.be.true;
		} );

		it( 'passes $root>image>caption>$text', () => {
			expect( schema.checkChild( r1i.getChild( 0 ), '$text' ) ).to.be.true;
		} );

		it( 'rejects $root>$root', () => {
			expect( schema.checkChild( root1, '$root' ) ).to.be.false;
		} );

		it( 'rejects $root>$text', () => {
			expect( schema.checkChild( root1, '$text' ) ).to.be.false;
		} );

		it( 'rejects $root>caption', () => {
			expect( schema.checkChild( root1, 'caption' ) ).to.be.false;
		} );

		it( 'rejects $root>paragraph>paragraph', () => {
			expect( schema.checkChild( r1p1, 'paragraph' ) ).to.be.false;
		} );

		it( 'rejects $root>paragraph>paragraph>$text', () => {
			// Edge case because p>p should not exist in the first place.
			// But it's good to know that it blocks also this.
			const p = new Element( 'p' );
			r1p1.appendChildren( p );

			expect( schema.checkChild( p, '$text' ) ).to.be.false;
		} );

		it( 'rejects $root>paragraph>$block', () => {
			expect( schema.checkChild( r1p1, '$block' ) ).to.be.false;
		} );

		it( 'rejects $root>paragraph>blockQuote', () => {
			expect( schema.checkChild( r1p1, 'blockQuote' ) ).to.be.false;
		} );

		it( 'rejects $root>paragraph>image', () => {
			expect( schema.checkChild( r1p1, 'image' ) ).to.be.false;
		} );

		it( 'rejects $root>paragraph>caption', () => {
			expect( schema.checkChild( r1p1, 'caption' ) ).to.be.false;
		} );

		it( 'rejects $root>blockQuote>blockQuote', () => {
			expect( schema.checkChild( r1bQ, 'blockQuote' ) ).to.be.false;
		} );

		it( 'rejects $root>blockQuote>caption', () => {
			expect( schema.checkChild( r1p1, 'image' ) ).to.be.false;
		} );

		it( 'rejects $root>blockQuote>$text', () => {
			expect( schema.checkChild( r1bQ, '$text' ) ).to.be.false;
		} );

		it( 'rejects $root>image>$text', () => {
			expect( schema.checkChild( r1i, '$text' ) ).to.be.false;
		} );

		it( 'rejects $root>image>paragraph', () => {
			expect( schema.checkChild( r1i, 'paragraph' ) ).to.be.false;
		} );

		it( 'rejects $root>image>caption>paragraph', () => {
			expect( schema.checkChild( r1i.getChild( 0 ), 'paragraph' ) ).to.be.false;
		} );

		it( 'rejects $root>image>caption>blockQuote', () => {
			expect( schema.checkChild( r1i.getChild( 0 ), 'blockQuote' ) ).to.be.false;
		} );

		it( 'accepts attribute $root>paragraph[alignment]', () => {
			expect( schema.checkAttribute( r1p1, 'alignment' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>paragraph>$text[bold]', () => {
			expect( schema.checkAttribute( r1p1.getChild( 0 ), 'bold' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>heading1>$text[italic]', () => {
			expect( schema.checkAttribute( r1h.getChild( 0 ), 'italic' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>blockQuote>paragraph>$text[bold]', () => {
			expect( schema.checkAttribute( r1bQp.getChild( 0 ), 'bold' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>listItem[alignment]', () => {
			expect( schema.checkAttribute( r1lI, 'alignment' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>listItem[indent]', () => {
			expect( schema.checkAttribute( r1lI, 'indent' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>listItem[type]', () => {
			expect( schema.checkAttribute( r1lI, 'type' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>image[src]', () => {
			expect( schema.checkAttribute( r1i, 'src' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>image[alt]', () => {
			expect( schema.checkAttribute( r1i, 'alt' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>image>caption>$text[bold]', () => {
			expect( schema.checkAttribute( r1i.getChild( 0 ).getChild( 0 ), 'bold' ) ).to.be.true;
		} );

		it( 'rejects attribute $root[indent]', () => {
			expect( schema.checkAttribute( root1, 'indent' ) ).to.be.false;
		} );

		it( 'rejects attribute $root>paragraph[indent]', () => {
			expect( schema.checkAttribute( r1p1, 'indent' ) ).to.be.false;
		} );

		it( 'accepts attribute $root>heading1>$text[bold]', () => {
			expect( schema.checkAttribute( r1h.getChild( 0 ), 'bold' ) ).to.be.false;
		} );

		it( 'rejects attribute $root>paragraph>$text[alignment]', () => {
			expect( schema.checkAttribute( r1p1.getChild( 0 ), 'alignment' ) ).to.be.false;
		} );

		it( 'rejects attribute $root>blockQuote[indent]', () => {
			expect( schema.checkAttribute( r1bQ, 'indent' ) ).to.be.false;
		} );

		it( 'rejects attribute $root>blockQuote[alignment]', () => {
			expect( schema.checkAttribute( r1bQ, 'alignment' ) ).to.be.false;
		} );

		it( 'rejects attribute $root>image[indent]', () => {
			expect( schema.checkAttribute( r1i, 'indent' ) ).to.be.false;
		} );

		it( 'rejects attribute $root>image[alignment]', () => {
			expect( schema.checkAttribute( r1i, 'alignment' ) ).to.be.false;
		} );

		it( '$root is limit', () => {
			expect( schema.isLimit( '$root' ) ).to.be.true;
			expect( schema.isBlock( '$root' ) ).to.be.false;
			expect( schema.isObject( '$root' ) ).to.be.false;
		} );

		it( 'paragraph is block', () => {
			expect( schema.isLimit( 'paragraph' ) ).to.be.false;
			expect( schema.isBlock( 'paragraph' ) ).to.be.true;
			expect( schema.isObject( 'paragraph' ) ).to.be.false;
		} );

		it( 'heading1 is block', () => {
			expect( schema.isLimit( 'heading1' ) ).to.be.false;
			expect( schema.isBlock( 'heading1' ) ).to.be.true;
			expect( schema.isObject( 'heading1' ) ).to.be.false;
		} );

		it( 'listItem is block', () => {
			expect( schema.isLimit( 'listItem' ) ).to.be.false;
			expect( schema.isBlock( 'listItem' ) ).to.be.true;
			expect( schema.isObject( 'listItem' ) ).to.be.false;
		} );

		it( 'image is block object', () => {
			expect( schema.isLimit( 'image' ) ).to.be.false;
			expect( schema.isBlock( 'image' ) ).to.be.true;
			expect( schema.isObject( 'image' ) ).to.be.true;
		} );

		it( 'caption is limit', () => {
			expect( schema.isLimit( 'caption' ) ).to.be.true;
			expect( schema.isBlock( 'caption' ) ).to.be.false;
			expect( schema.isObject( 'caption' ) ).to.be.false;
		} );
	} );

	// TODO:
	// * getValidRanges
	// * checkAttributeInSelectionn
	// * add normalization to isObject(), isLimit(), isBlock(), isRegistered() and improve the existing code
	//   * see insertContent's _checkIsObject()
	// * test the default abstract entities (in model.js)
} );

describe( 'SchemaContext', () => {
	let root;

	beforeEach( () => {
		root = new Element( '$root', null, [
			new Element( 'blockQuote', { foo: 1 }, [
				new Element( 'paragraph', { align: 'left' }, [
					new Text( 'foo', { bold: true, italic: true } )
				] )
			] )
		] );
	} );

	describe( 'constructor()', () => {
		it( 'creates context based on an array of strings', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx.length ).to.equal( 3 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ 'a', 'b', 'c' ] );
			expect( ctx.getItem( 0 ).name ).to.equal( 'a' );

			expect( Array.from( ctx.getItem( 0 ).getAttributeKeys() ) ).to.be.empty;
			expect( ctx.getItem( 0 ).getAttribute( 'foo' ) ).to.be.undefined;
		} );

		it( 'creates context based on an array of elements', () => {
			const blockQuote = root.getChild( 0 );
			const text = blockQuote.getChild( 0 ).getChild( 0 );

			const ctx = new SchemaContext( [ blockQuote, text ] );

			expect( ctx.length ).to.equal( 2 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ 'blockQuote', '$text' ] );
			expect( ctx.getItem( 0 ).name ).to.equal( 'blockQuote' );

			expect( Array.from( ctx.getItem( 1 ).getAttributeKeys() ).sort() ).to.deep.equal( [ 'bold', 'italic' ] );
			expect( ctx.getItem( 1 ).getAttribute( 'bold' ) ).to.be.true;
		} );

		it( 'creates context based on a mixed array of strings and elements', () => {
			const blockQuote = root.getChild( 0 );
			const text = blockQuote.getChild( 0 ).getChild( 0 );

			const ctx = new SchemaContext( [ blockQuote, 'paragraph', text ] );

			expect( ctx.length ).to.equal( 3 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ 'blockQuote', 'paragraph', '$text' ] );
		} );

		it( 'creates context based on a root element', () => {
			const ctx = new SchemaContext( root );

			expect( ctx.length ).to.equal( 1 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ '$root' ] );

			expect( Array.from( ctx.getItem( 0 ).getAttributeKeys() ) ).to.be.empty;
			expect( ctx.getItem( 0 ).getAttribute( 'foo' ) ).to.be.undefined;
		} );

		it( 'creates context based on a nested element', () => {
			const ctx = new SchemaContext( root.getChild( 0 ).getChild( 0 ) );

			expect( ctx.length ).to.equal( 3 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ '$root', 'blockQuote', 'paragraph' ] );

			expect( Array.from( ctx.getItem( 1 ).getAttributeKeys() ) ).to.deep.equal( [ 'foo' ] );
			expect( ctx.getItem( 1 ).getAttribute( 'foo' ) ).to.equal( 1 );
			expect( Array.from( ctx.getItem( 2 ).getAttributeKeys() ) ).to.deep.equal( [ 'align' ] );
			expect( ctx.getItem( 2 ).getAttribute( 'align' ) ).to.equal( 'left' );
		} );

		it( 'creates context based on a text node', () => {
			const ctx = new SchemaContext( root.getChild( 0 ).getChild( 0 ).getChild( 0 ) );

			expect( ctx.length ).to.equal( 4 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ '$root', 'blockQuote', 'paragraph', '$text' ] );

			expect( Array.from( ctx.getItem( 3 ).getAttributeKeys() ).sort() ).to.deep.equal( [ 'bold', 'italic' ] );
			expect( ctx.getItem( 3 ).getAttribute( 'bold' ) ).to.be.true;
		} );

		it( 'creates context based on a text proxy', () => {
			const text = root.getChild( 0 ).getChild( 0 ).getChild( 0 );
			const textProxy = new TextProxy( text, 0, 1 );
			const ctx = new SchemaContext( textProxy );

			expect( ctx.length ).to.equal( 4 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ '$root', 'blockQuote', 'paragraph', '$text' ] );

			expect( Array.from( ctx.getItem( 3 ).getAttributeKeys() ).sort() ).to.deep.equal( [ 'bold', 'italic' ] );
			expect( ctx.getItem( 3 ).getAttribute( 'bold' ) ).to.be.true;
		} );

		it( 'creates context based on a position', () => {
			const pos = Position.createAt( root.getChild( 0 ).getChild( 0 ) );
			const ctx = new SchemaContext( pos );

			expect( ctx.length ).to.equal( 3 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ '$root', 'blockQuote', 'paragraph' ] );

			expect( Array.from( ctx.getItem( 2 ).getAttributeKeys() ).sort() ).to.deep.equal( [ 'align' ] );
		} );
	} );

	describe( 'length', () => {
		it( 'gets the number of items', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx.length ).to.equal( 3 );
		} );
	} );

	describe( 'last', () => {
		it( 'gets the last item', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx.last ).to.be.an( 'object' );
			expect( ctx.last.name ).to.equal( 'c' );
		} );
	} );

	describe( 'Symbol.iterator', () => {
		it( 'exists', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx[ Symbol.iterator ] ).to.be.a( 'function' );
			expect( Array.from( ctx ).map( item => item.name ) ).to.deep.equal( [ 'a', 'b', 'c' ] );
		} );
	} );

	describe( 'getItem()', () => {
		it( 'returns item by index', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx.getItem( 1 ) ).to.be.an( 'object' );
			expect( ctx.getItem( 1 ).name ).to.equal( 'b' );
		} );

		it( 'returns undefined if index exceeds the range', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx.getItem( 3 ) ).to.be.undefined;
		} );
	} );

	describe( 'getNames()', () => {
		it( 'returns an iterator', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx.getNames().next ).to.be.a( 'function' );
		} );

		it( 'returns an iterator which returns all item names', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ 'a', 'b', 'c' ] );
		} );
	} );

	describe( 'matchEnd()', () => {
		it( 'returns true if the end of the context matches the query - 1 item', () => {
			const ctx = new SchemaContext( [ 'foo', 'bar', 'bom', 'dom' ] );

			expect( ctx.matchEnd( 'dom' ) ).to.be.true;
		} );

		it( 'returns true if the end of the context matches the query - 2 items', () => {
			const ctx = new SchemaContext( [ 'foo', 'bar', 'bom', 'dom' ] );

			expect( ctx.matchEnd( 'bom dom' ) ).to.be.true;
		} );

		it( 'returns true if the end of the context matches the query - full match of 3 items', () => {
			const ctx = new SchemaContext( [ 'foo', 'bar', 'bom' ] );

			expect( ctx.matchEnd( 'foo bar bom' ) ).to.be.true;
		} );

		it( 'returns true if the end of the context matches the query - full match of 1 items', () => {
			const ctx = new SchemaContext( [ 'foo' ] );

			expect( ctx.matchEnd( 'foo' ) ).to.be.true;
		} );

		it( 'returns true if not only the end of the context matches the query', () => {
			const ctx = new SchemaContext( [ 'foo', 'foo', 'foo', 'foo' ] );

			expect( ctx.matchEnd( 'foo foo' ) ).to.be.true;
		} );

		it( 'returns false if query matches the middle of the context', () => {
			const ctx = new SchemaContext( [ 'foo', 'bar', 'bom', 'dom' ] );

			expect( ctx.matchEnd( 'bom' ) ).to.be.false;
		} );

		it( 'returns false if query matches the start of the context', () => {
			const ctx = new SchemaContext( [ 'foo', 'bar', 'bom', 'dom' ] );

			expect( ctx.matchEnd( 'foo' ) ).to.be.false;
		} );

		it( 'returns false if query does not match', () => {
			const ctx = new SchemaContext( [ 'foo', 'bar', 'bom', 'dom' ] );

			expect( ctx.matchEnd( 'dom bar' ) ).to.be.false;
		} );

		it( 'returns false if query is longer than context', () => {
			const ctx = new SchemaContext( [ 'foo' ] );

			expect( ctx.matchEnd( 'bar', 'foo' ) ).to.be.false;
		} );
	} );
} );
