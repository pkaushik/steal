steal.loading('mxui/layout/fill/fill.js','mxui/util/scrollbar_width/scrollbar_width.js','mxui/layout/table_fill/table_fill.js','mxui/layout/table_scroll/table_scroll.js');
steal('jquery/dom/dimensions', 'jquery/event/resize').then(function( $ ) {
	//evil things we should ignore
	var matches = /script|td/,

		// if we are trying to fill the page
		isThePage = function( el ) {
			return el === document || el === document.documentElement || el === window || el === document.body
		},
		//if something lets margins bleed through
		bleeder = function( el ) {
			if ( el[0] == window ) {
				return false;
			}
			var styles = el.curStyles('borderBottomWidth', 'paddingBottom')
			return !parseInt(styles.borderBottomWidth) && !parseInt(styles.paddingBottom)
		},
		//gets the bottom of this element
		bottom = function( el, offset ) {
			//where offsetTop starts
			return el.outerHeight() + offset(el);
		}
		pageOffset = function( el ) {
			return el.offset().top
		},
		offsetTop = function( el ) {
			return el[0].offsetTop;
		},
		inFloat = function( el, parent ) {
			while ( el && el != parent ) {
				var flt = $(el).css('float')
				if ( flt == 'left' || flt == 'right' ) {
					return flt;
				}
				el = el.parentNode
			}
		},
		/**
		 * @function jQuery.fn.mxui_layout_fill
		 * @parent Mxui
		 * @test mxui/layout/fill/funcunit.html
		 * @plugin mxui/layout/fill
		 * 
		 * Fills a parent element's height with the another 
		 * element.  This is extremely useful for complex layout,
		 * especially when you want to account for line-wrapping.
		 * 
		 * ## Basic Example
		 * 
		 * If you have the following html:
		 * 
		 *     <div id='box'>
		 * 	    <p>I am a long heading.</p>
		 * 	    <div id='child'>I'm a child.</div>
		 *     </div>
		 * 
		 * The follow makes `#child` fill up `#box`:
		 * 
		 *     $('#child').mxui_layout_fill("#box")
		 * 
		 * ## Demo
		 * 
		 * @demo mxui/layout/fill/demo.html
		 * 
		 * ## Limitations
		 * 
		 * Fill currently does not well with:
		 * 
		 *   - Bleeding margins - Where margins leak through parent elements
		 *     because the parent elements do not have a padding or border.
		 *     
		 *   - Tables - You shouldn't be using tables to do layout anyway.  
		 *   
		 *   - Floated Elements - the child element has `float: left` or `float: right`
		 * 
		 * 
		 * @param {HTMLElement|selector} [parent] the parent element 
		 * to fill, defaults to the element's parent.
		 * 
		 * The following fills the parent to `#child`:
		 * 
		 *     $('#child').mxui_layout_fill()
		 *    
		 * A selector can also be pased.  This selector is passed to jQuery's
		 * closet method.  The following matches the first `#parent` element that
		 * is a parentNode of `#child`:
		 * 
		 *     $('#child').mxui_layout_fill("#parent")
		 *    
		 * An element or window can also be passed.  The following will make
		 * `#child` big enough so the entire window is filled:
		 * 
		 *     $('#child').mxui_layout_fill(window)
		 * 
		 * @return {jQuery} the original jQuery collection for chaining.
		 */
		filler = $.fn.mxui_layout_fill = function( parent ) {
			// setup stuff on every element
			this.addClass('mxui_layout_fill')
			
			
			var options = parent;
			options || (options = {});
			if(typeof options == 'string'){
				options = this.closest(options)
			}
			if ( options.jquery || options.nodeName ) {
				options = {parent: options};
			}
			
			options.parent || (options.parent = $(this).parent())
			options.parent = $(options.parent)
			
			var thePage = isThePage(options.parent[0]);
			
			if ( thePage ) {
				options.parent = $(window)
			}
			
			
			this.each(function(){
				
				var evData = {
					filler: $(this),
					inFloat: inFloat(this, thePage ? document.body : options.parent[0]),
					options: options
				},
				cb = function(){
					filler.parentResize.apply(this, arguments)
				}
				$(options.parent).bind('resize', evData, cb);
				//if this element is removed, take it out
	
				$(this).bind('destroyed', evData, function( ev ) {
					$(ev.target).removeClass('mxui_filler')
					$(options.parent).unbind('resize', cb)
				});
				
			})
			

			
			//add a resize to get things going
			var func = function() {
				options.parent.resize();
			}
			if ( $.isReady ) {
				func();
			} else {
				$(func)
			}
			return this;
		};


	$.extend(filler, {
		parentResize: function( ev ) {
			if (ev.data.filler.is(':hidden')) {
				return;
			}
			
			var parent = $(this),
				isWindow = this == window,
				container = (isWindow ? $(document.body) : parent),

				//if the parent bleeds margins, we don't care what the last element's margin is
				isBleeder = bleeder(parent),
				children = container.children().filter(function() {
					if ( matches.test(this.nodeName.toLowerCase()) ) {
						return false;
					}

					var get = $.curStyles(this, ['position', 'display']);
					return get.position !== "absolute" && get.position !== "fixed" && get.display !== "none" && !jQuery.expr.filters.hidden(this)
				}),
				last = children.eq(-1),
				first,
				parentHeight = parent.height() - (isWindow ? parseInt(container.css('marginBottom'), 10) || 0 : 0),
				currentSize;
			var div = '<div style="height: 0px; line-height:0px;overflow:hidden;' + (ev.data.inFloat ? 'clear: both' : '') + ';"/>'
			if ( isBleeder ) {
				//temporarily add a small div to use to figure out the 'bleed-through' margin
				//of the last element
				last = $(div).appendTo(container);
				
			}
			
			//for performance, we want to figure out the currently used height of the parent element
			// as quick as possible
			// we can use either offsetTop or offset depending ...
			if ( last && last.length > 0 ) {
				if ( last.offsetParent()[0] === container[0] ) {
					currentSize = last[0].offsetTop + last.outerHeight();
				} else if (last.offsetParent()[0] === container.offsetParent()[0]) {
					first = $(div).prependTo(container);
					currentSize = ( last[0].offsetTop + last.outerHeight() ) - first[0].offsetTop;
					first.remove();
				} else {
					// add first so we know where to start from .. do not bleed in this case
					first = $(div).prependTo(container);
					/*console.log('last', last,'last-top', last.offset().top, 'last-height',last.outerHeight(),
						'\nct',container, "container-top",container.offset().top,
						'\nfirst',first, "first-top",
						first.offset().top,
						'parentMatch',
						last.offsetParent()[0] === container.offsetParent()[0])*/
					currentSize = ( last.offset().top + last.outerHeight() ) - first.offset().top //- container.offset().top
					first.remove();
				}
			}

			// what the difference between the parent height and what we are going to take up is
			var delta = parentHeight - currentSize,
				// the current height of the object
				fillerHeight = ev.data.filler.height();

			//adjust the height
			if ( ev.data.options.all ) {
				// we don't care about anything else ... we are likely absolutely positioned
				//we need to fill the parent width ...
				// temporarily collapse ... then expand ...
				ev.data.filler.height(0).width(0);
				var parentWidth = parent.width(),
					parentHeight = parent.height();

				ev.data.filler.outerHeight(parentHeight);
				ev.data.filler.outerWidth(parentWidth);
			} else {
				//console.log(ev.data.filler, "parentHeight",parentHeight, "currentSize",currentSize)
				ev.data.filler.height(fillerHeight + delta)
			}


			//remove the temporary element
			if ( isBleeder ) {
				last.remove();
				
			}
		}
	});

});
steal.loaded('mxui/layout/fill/fill.js');
steal('jquery').then(function($){
		var div = $('<div id="out"><div style="height:200px;"></div></div>').css({
				position: "absolute",
				top: "0px",
				left: "0px",
				visibility: "hidden",
				width: "100px",
				height: "100px",
				overflow: "hidden"
			}).appendTo(document.body),
			inner = $(div[0].childNodes[0]),
			w1 = inner[0].offsetWidth,
			w2;

		div.css("overflow","scroll");
		//inner.css("width","100%"); //have to set this here for chrome
		var w2 = inner[0].offsetWidth;		
		if (w2 == w1) {
			inner.css("width", "100%"); //have to set this here for chrome
			w2 = inner[0].offsetWidth;
		}
		div.remove();
		(window.Mxui || (window.Mxui = {}) ).scrollbarWidth = w1 - w2;
})
;
steal.loaded('mxui/util/scrollbar_width/scrollbar_width.js');
steal('mxui/layout/fill',
	'mxui/util/scrollbar_width',
	'jquery/controller').then(function(){
	
//makes a table fill out it's parent

$.Controller('Mxui.Layout.TableFill',{
	setup : function(el, options){
		//remove the header and put in another table
		el = $(el);
		if(el[0].nodeName.toLowerCase() == 'table'){
			this.$ = {
				table: el
			}
			this._super(this.$.table.wrap("<div></div>").parent(), 
					options)
		} else {
			this.$ = {
				table: el.find('table:first')
			}
			this._super(el, options);
		}
		
	},
	init : function(){
		// add a filler ...
		var options = {};
		if(this.options.parent){
			options.parent = this.options.parent;
			options.filler = this.options.filler;
		}
		this.element.mxui_layout_fill(options).css('overflow','auto');
		
	},
	// listen on resize b/c we want to do this right away
	// in case anyone else cares about the table's
	// dimensions (like table scroll)
	resize : function(ev){
		var table = this.$.table,
			el = this.element[0];
		//let the table flow naturally
		table.css("width","");
		
		// is it scrolling vertically
		if(el.offsetHeight < el.scrollHeight){
			table.outerWidth(this.element.width() - Mxui.scrollbarWidth)
		} else {
			table.outerWidth(this.element.width() )
		}
		
	}
})
	
})
;
steal.loaded('mxui/layout/table_fill/table_fill.js');
steal('mxui/layout/table_fill').then(function( $ ) {

	// helpers
	var setWidths = function( cells, firstWidths ) {
		var length = cells.length - 1;
		for ( var i = 0; i < length; i++ ) {
			cells.eq(i).outerWidth(firstWidths[i]);
		}
	}

	/**
	 * @class Mxui.Layout.TableScroll
	 * @parent Mxui
	 * @test mxui/layout/table_scroll/funcunit.html
	 * 
	 * @description Makes a table body scroll under a table header.
	 * 
	 * Makes a table body scroll under a table 
	 * header.  This is very useful for making grid-like widgets.
	 * 
	 * ## Basic Example
	 * 
	 * If you have the following html:
	 * 
	 *     <div id='area' style='height: 500px'>
	 *        <p>This is My Table</p>
	 *        <table id='people'>
	 *          <thead>
	 *            <tr> <th>Name</th><th>Age</th><th>Location</th> </tr>
	 *          </thead>
	 *          <tbody>
	 *            <tr> <td>Justin</td><td>28</td><td>Chicago</td> </tr>
	 *            <tr> <td>Brian</td><td>27</td><td>Chicago</td> </tr>
	 *            ...
	 *          </tbody>
	 *        </table>
	 *     </div>
	 * 
	 * The following make the list of people, the tbody, scrollable between
	 * the table header and footer:
	 * 
	 *     $('#people').mxui_layout_table_scroll()
	 * 
	 * It makes it so you can always see the table header 
	 * and footer.  The table will [Mxui.Layout.Fill fill] the height of it's parent 
	 * element. This means that if the `#area` element's height 
	 * is 500px, the table will take up everything outside the `p`aragraph element.
	 * 
	 * ## Demo
	 * 
	 * @demo mxui/layout/table_scroll/demo.html
	 * 
	 * ## How it works
	 * 
	 * To scroll the `tbody` under the `thead`, TableScroll 
	 * wraps the table with `div`s and seperates out the 
	 * `thead` into its own div.  After changing the DOM,
	 * the table looks like:
	 * 
	 *     <div class='mxui_layout_table_scroll'>
	 *       <div class='header'>
	 *          <table>
	 *            <thead> THEAD CONTENT </thead>
	 *          </table>
	 *       </div>
	 *       <div class='body'>
	 *          <div class='scrollBody'>
	 *            <table>
	 *              <tbody> TBODY CONENT </tbody>
	 *            </table>
	 *          </div>
	 *       </div>
	 *     </div>
	 * 
	 * The grid also maintains a copy of the `thead`'s content
	 * in the scrolling table to ensure the columns are 
	 * sized correctly.
	 * 
	 * ## Changing the table
	 * 
	 * When you change the table's content, the table
	 * often needs to update the positions of 
	 * the column header.  If you change the tbody's content,
	 * you can simply trigger resize on the grid.
	 * 
	 * But, if you change the columns, you must call
	 * [Mxui.Layout.Fill.prototype.changed changed].
	 * 
	 * @constructor
	 * 
	 * @param {HTMLElement} el
	 * @param {Object} [options] values to configure
	 * the behavior of table scroll:
	 * 
	 *    - `filler` - By default, the table fills 
	 *      it's parent's height. Pass false to not actually scroll the
	 *      table.
	 */
	$.Controller("Mxui.Layout.TableScroll", {
		defaults: {
			// this option is really for the grid, because the grid
			// uses table scroll internally to add items to
			// the list
			filler: true
		}
	},
	/** 
	 * @prototype
	 */
	{
		setup: function( el, options ) {
			// a cache of elements.
			this.$ = {
				table: $(el)
			}
			// the area that scrolls
			this.$.scrollBody = this.$.table.wrap("<div><div  class='body'><div class='scrollBody'></div></div></div>").parent()
			// a div that houses the scrollable area.  IE < 8 needs this.  It acts
			// as a buffer for the scroll bar
			this.$.body = this.$.scrollBody.parent();

			this._super(this.$.body.parent()[0], options)
			//wrap table with a scrollable div

		},
		init: function() {
			// body acts as a buffer for the scroll bar
			this.$.body.css("width", "100%");

			// get the thead, and tfoot into their own table.
			$.each(['thead', 'tfoot'], this.callback('_wrapWithTable'))


			// get the tbody
			this.$.tbody = this.$.table.children('tbody')

			// if one doesn't exist ... make it
			if (!this.$.tbody.length ) {
				this.$.tbody = $('<tbody/>')
				this.$.table.append(this.$.tbody)
			}

			// add thead
			if ( this.$.theadTable ) {
				this.$.head = $("<div class='header'></div>").css({
					"visibility": "hidden",
					overflow: "hidden"
				}).prependTo(this.element).append(this.$.theadTable);
				this._addSpacer('thead');
			}
			if ( this.$.tfootTable ) {
				this.$.foot = $("<div class='footer'></div>").css({
					"visibility": "hidden",
					overflow: "hidden"
				}).appendTo(this.element).append(this.$.tfootTable);
				this._addSpacer('tfoot');
			}


			// add representations of the header cells to the bottom of the table

			// fill up the parent
			//this.element.mxui_layout_fill();
			//make the scroll body fill up all other space
			// why doesn't it do this by default?
			if ( this.options.filler ) {
				this.$.scrollBody.mxui_layout_table_fill({
					parent: this.element.parent()
				})
			}

			this.bind(this.$.scrollBody, "resize", "bodyResized")
			//this.element.parent().triggerHandler('resize')
			//make a quick resize
			//then redraw the titles

			this.bind(this.$.scrollBody, "scroll", "bodyScroll")
			this._sizeHeaderAndFooters();
		},
		_wrapWithTable: function( i, tag ) {

			// save it
			this.$[tag] = this.$.table.children(tag)
			if ( this.$[tag].length && this.$[tag].find('td, th').length ) {
				// remove it (w/o removing any widgets on it)
				this.$[tag][0].parentNode.removeChild(this.$[tag][0]);

				//wrap it with a table and save the table
				this.$[tag + "Table"] = this.$.thead.wrap('<table/>').parent()
			}



		},
		/**
		 * Returns useful elements of the table
		 * the thead, tbody, tfoot, and scrollBody of the modified table:
		 * 
		 *     $('.mxui_layout_table_scroll')
		 *       .controller().element() //-> {...}
		 * 
		 * If you need to change the content of the table, you can
		 * use elements for access.  If you change the content, make sure
		 * you call changed.
		 * 
		 * @return {Object} an object like:
		 * 
		 *     {
		 *         tbody : HTMLTableSelectionElement,
		 *         tfoot : HTMLTableSelectionElement,
		 *         thead : HTMLTableSelectionElement,
		 *         scrollBody : HTMLDivElement
		 *     }
		 */
		elements: function() {
			return {
				tbody: this.$.tbody,
				tfoot: this.$.tfoot,
				thead: this.$.thead,
				scrollBody: this.$.scrollBody
			}
		},
		/**
		 * Call when columns are added or removed or the title's changed.
		 * 
		 * ### Example:
		 * 
		 *     $('th:eq(2)').text('New Text');
		 *     $('.mxui_layout_table_scroll')
		 *        .mxui_layout_table_scroll('changed')
		 * 
		 * @param {Boolean} [resize] By default, changed will trigger a resize,
		 * which re-calculates the layout.  Pass false to prevent this 
		 * from happening.
		 */
		changed: function( resize ) {
			if ( this.$.foot ) {
				this._addSpacer('tfoot');
			}
			if ( this.$.head ) {
				this._addSpacer('thead');
			}
			this._sizeHeaderAndFooters();
			if ( resize !== false ) {
				this.element.resize()
			}
		},
		/**
		 * Add elements to this scrollable table
		 * after an optional element. This 
		 * assumes these elements matches the 
		 * current column headers.  If you change the column
		 * headers, make sure you trigger resize.
		 * 
		 *     $('.mxui_layout_table_scroll')
		 *       .mxui_layout_table_scroll('append', elements );
		 * 
		 * @param {jQuery} els The elements to append.
		 * @param {jQuery|false} [after] where to insert items in the list
		 *   - If a jQuery collection is provided, elements will be added
		 *     after this element.  
		 *   - If `false`, elements will be added to the start of the grid.   
		 *   - If nothing is provided, elements will be added to the end of the list 
		 */
		append: function( els, after ) {

			if ( after ) {
				after.after(els);
			} else if ( after === false ) {
				this.$.tbody.prepend(els);
			} else if(this.$.spacer){
				this.$.spacer.before(els);
			} else {
				this.$.tbody.append(els);
			}

			this.element.resize();
		},
		/**
		 * Empties the table body.
		 * 
		 *     $('.mxui_layout_table_scroll')
		 *       .mxui_layout_table_scroll('empty');
		 *       
		 * @return {table_scroll} returns the table_scroll instance
		 * for chaining.
		 */
		empty: function() {
			this.$.tbody.children(":not(.spacing)").remove();
			this.element.resize();
			return this;
		},
		/**
		 * @hide
		 * Adds a spacer on the bottom of the table that mimicks the dimensions
		 * of the table header elements.  This keeps the body columns for being
		 * smaller than the header widths.
		 * 
		 * This ONLY works when the table is visible.
		 */
		_addSpacer: function( tag ) {
			if (!this.$[tag].is(":visible") ) {
				return;
			}
			//check last element ...
			var last = this.$.tbody.children('.spacing.' + tag)
			if ( last.length ) {
				last.remove();
			}

			var spacer = this.$[tag].children(0).clone().addClass('spacing').addClass(tag);

			// wrap contents with a spacing
			spacer.children("th, td").each(function() {
				var td = $(this);
				td.html("<div style='float: left;'>" + td.html() + "</div>")
			});

			spacer.appendTo(this.$.tbody);

			//now set spacing, and make minimal height
			spacer.children("th, td").each(function() {
				var $td = $(this),
					$spacer = $td.children(':first'),
					width = $spacer.outerWidth();

				$td.css({
					"padding-top": 0,
					"padding-bottom": 0,
					margin: 0,
					width: ""
				}) // If padding is removed from the cell sides, layout might break!
				$spacer.outerWidth(width + 2).css({
					"float": "none",
					"visibility": "hidden",
					height: "1px"
				}).html("")
			})
			this.$.spacer = spacer;
		},
		/**
		 * @hide
		 * When the body is resized, resize the header and footer th and td elements
		 */
		bodyResized: function() {
			this._sizeHeaderAndFooters();
		},
		bodyScroll: function( el, ev ) {
			this.$.head.scrollLeft(el.scrollLeft())
		},
		/**
		 * @hide
		 * Sizes the table header cells to match the width of 
		 * the column widths.
		 */
		_sizeHeaderAndFooters: function() {

			var body = this.$.body,

				// getting the outer widths is the most expensive thing
				firstWidths = this.$.tbody.find("tr:first:not(.spacing)").children().map(function() {
					return $(this).outerWidth()
				}),

				padding = this.$.table.height() >= body.height() ? Mxui.scrollbarWidth : 0,
				tableWidth = this.$.table.width();

			if ( tableWidth ) {
				if ( this.$.foot ) {
					var cells = this.$.tfootTable.find("th, td")
					if ( cells.length == firstWidths.length ) {
						setWidths(cells, firstWidths);
					}
					this.$.foot.css('visibility', 'visible')
					this.$.tfootTable.width(tableWidth + padding)
				}

				if ( this.$.head ) {
					var cells = this.$.theadTable.find("th, td")
					if ( cells.length == firstWidths.length ) {
						setWidths(cells, firstWidths);
					}
					this.$.head.css('visibility', 'visible')
					this.$.theadTable.width(tableWidth + padding)
				}
			}
		},

		destroy: function() {
			delete this.$;
			this._super();
		}
	})


});
steal.loaded('mxui/layout/table_scroll/table_scroll.js')