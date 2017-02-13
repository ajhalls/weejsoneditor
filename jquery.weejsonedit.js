// Wee JSON Editor

// Extremely small (inline) JSON editor
// Presents JSON data in a very compact format, suitable for editing inline in forms, etc.

// Copyright 2015 Neal Shannon Cruey

// Derived from:
// https://github.com/DavidDurman/FlexiJsonEditor
// further updated to allow dynamic naming of arrays, and to prevent objects from 
// showing on right, overflow looked ugly, made {Object} tag clickable. 
// Add buttons also reference the object being added to.


// Example:

//     var myjson = { any: { json: { value: 1 } } };
//     var opt = { change: function() { /* called on every change */ } };
//     /* opt.propertyElement = '<textarea>'; */ // element of the property field, <input> is default
//     /* opt.valueElement = '<textarea>'; */  // element of the value field, <input> is default
//     $('#mydiv').weeJsonEditor(myjson, opt);

(function($) {

    $.fn.weeJsonEditor = function(json, options) {
        options = options || {};
        // Make sure functions or other non-JSON data types are stripped down.
        json = parse(stringify(json));

        var K = function() {
        };
        var onchange = options.change || K;
        var onpropertyclick = options.propertyclick || K;

        return this.each(function() {
            JSONEditor($(this), json, onchange, onpropertyclick, options.propertyElement, options.valueElement);
        });

    };

    function JSONEditor(container, json, onchange, onpropertyclick, propertyElement, valueElement) {
        // make sure the parent container is pristine...
        container.empty();
        
        var $modebtns = $('<div class="modebutton mode-edit">editor</div><div class="modebutton mode-text">text</div>');
        var $editor = $('<div class="weejsoneditor">');
        var $raw = $('<textarea class="raw" style="display: none;">');
        var parentItem;
        // style the parent container
        container.addClass("weejsoneditor");

        var opt = {
            container : container,
            target : $editor,
            raw : $raw,
            onchange : onchange,
            onpropertyclick : onpropertyclick,
            original : json,
            propertyElement : propertyElement,
            valueElement : valueElement
        };

        // mode toggle buttons
        container.append($modebtns);
        container.find('.mode-text').click(function() {
            $(this).parent().find(".editor").hide();
            $(this).parent().find(".raw").show();
        });
        container.find('.mode-edit').click(function() {
            $(this).parent().find(".editor").show();
            $(this).parent().find(".raw").hide();
        });

        // build the editor
        container.append($editor);
        construct(opt, json, $editor);
        $(opt.target).on('blur focus', '.property, .value', function() {
            $(this).toggleClass('editing');
        });
        
        // shove the data in an accessible attribute ON THE PARENT
        container.data("data", opt.original);

        // add an invisible textarea edit box, and mode toggle buttons
        opt.raw.css('font-family', '"Courier New", Courier, monospace');
        opt.raw.val(JSON.stringify(opt.original, null, "    "));
        container.append(opt.raw);
        opt.raw.on('change', function() {
            var valobj = parse($(this).val());
            construct(opt, valobj, opt.target);
            opt.container.data("data", valobj);
        });
    }

    function isObject(o) {
        return Object.prototype.toString.call(o) == '[object Object]';
    }

    function isArray(o) {
        return Object.prototype.toString.call(o) == '[object Array]';
    }

    function isBoolean(o) {
        return Object.prototype.toString.call(o) == '[object Boolean]';
    }

    function isNumber(o) {
        return Object.prototype.toString.call(o) == '[object Number]';
    }

    function isString(o) {
        return Object.prototype.toString.call(o) == '[object String]';
    }

    var types = 'object array boolean number string null';

    // Feeds object `o` with `value` at `path`. If value argument is omitted,
    // object at `path` will be deleted from `o`.
    // Example:
    //      feed({}, 'foo.bar.baz', 10);    // returns { foo: { bar: { baz: 10 } } }
    function feed(o, path, value) {
        var del = arguments.length == 2;

        if (path.indexOf('.') > -1) {
            var diver = o, i = 0, parts = path.split('.');
            for (var len = parts.length; i < len - 1; i++) {
                diver = diver[parts[i]];
            }
            if (del)
                delete diver[parts[len - 1]];
            else
                diver[parts[len - 1]] = value;
        } else {
            if (del)
                delete o[path];
            else
                o[path] = value;
        }
        return o;
    }

    // Get a property by path from object o if it exists. If not, return defaultValue.
    // Example:
    //     def({ foo: { bar: 5 } }, 'foo.bar', 100);   // returns 5
    //     def({ foo: { bar: 5 } }, 'foo.baz', 100);   // returns 100
    function def(o, path, defaultValue) {
        path = path.split('.');
        var i = 0;
        while (i < path.length) {
            if (( o = o[path[i++]]) == undefined)
                return defaultValue;
        }
        return o;
    }

    function error(reason) {
        if (window.console) {
            console.error(reason);
        }
    }

    function parse(str) {
        var res;
        try {
            res = JSON.parse(str);
        } catch (e) {
            res = null;
            error('JSON parse failed.');
        }
        return res;
    }

    function stringify(obj) {
        var res;
        try {
            res = JSON.stringify(obj);
        } catch (e) {
            res = 'null';
            error('JSON stringify failed.');
        }
        return res;
    }

    function addExpander(item) {
        if (item.children('.expander').length == 0) {
            var expander = $('<span>', {
                'class' : 'expander'
            });
            expander.bind('click', function() {
                var item = $(this).parent();
                item.toggleClass('expanded');
            });
            item.prepend(expander);
        }
    }

    function addListAppender(item, handler, parentItem) {
        var appender = $('<div>', {
            'class' : 'item appender'
        }), btn = $('<span></span>');

        //console.log(parentItem);
        btn.text('[+] add to '+ parentItem);

        appender.append(btn);
        item.append(appender);

        btn.click(handler);

        return appender;
    }

    function addNewValue(json) {
        if (isArray(json)) {
            json.push(null);
            return true;
        }

        if (isObject(json)) {
            var i = 1, newName = "newKey";

            while (json.hasOwnProperty(newName)) {
                newName = "newKey" + i;
                i++;
            }

            json[newName] = null;
            return true;
        }

        return false;
    }

    function construct(opt, json, root, path) {
        path = path || '';

        root.children('.item').remove();

        for (var key in json) {
            if (!json.hasOwnProperty(key))
                continue;

            var item = $('<div>', {
                'class' : 'item',
                'data-path' : path
            }), property = $(opt.propertyElement || '<input class="left">', {
                'class' : 'property'
            }), value = $(opt.valueElement || '<span><input class="right"></span>', {
                'class' : 'value'
            });

            if (isObject(json[key]) || isArray(json[key])) {
                addExpander(item);
            }

            item.append(property).append(value);
            root.append(item);

            //this is where the form gets built with key value pairs
            //right side (value)
           
            property.val(key).attr('title', key);
            var val = stringify(json[key]);
            value.val(val).children().val( val);
            
               
            assignType(item, json[key]);

            property.change(propertyChanged(opt));
            value.change(valueChanged(opt));
            property.click(propertyClicked(opt));

            if (isObject(json[key]) || isArray(json[key])) {         
                property.val(key).attr('title', key);
                var val = "{ Object }"; 
                value.val(val).children().val(val);
                value.val(val).children()[0].disabled = true;
                item.children("span:last").append('<span class="expandLink" style="position:absolute;left:150px;height:20px;width:120px;z-index:999999"></span>');
                $(".expandLink").unbind('click').click( function() {
                var item = $(this).parent().parent();
                item.toggleClass('expanded');
            });
            }  

            parentItem = key;
            if ( !isNaN(key)){
                property.val(key).val("Tween-" + key);
            }


            if (isObject(json[key]) || isArray(json[key])) {
                construct(opt, json[key], item, ( path ? path + '.' : '') + key);
            }

            if (isObject(json[key]) || isArray(json[key])) {
                
                parentItem = key;
                if ( !isNaN(key)){
                    parentItem = "Tween-" + key;
                }
                addListAppender(root, function() {
                    addNewValue(json);
                    construct(opt, json, root, path);
                    opt.onchange(parse(stringify(opt.original)));



                }, parentItem)
                
            }  

        

        }


    }

    function updateParents(el, opt) {
        $(el).parentsUntil(opt.target).each(function() {
            var path = $(this).data('path');
            path = ( path ? path + '.' : path) + $(this).children('.property').val();
            var val = stringify(def(opt.original, path, null));
            $(this).children('.value').val(val).attr('title', val);
        });
    }

    function propertyClicked(opt) {
        return function() {
            var path = $(this).parent().data('path');
            var key = $(this).attr('title');

            var safePath = path ? path.split('.').concat([key]).join('\'][\'') : key;

            opt.onpropertyclick('[\'' + safePath + '\']');
        };
    }

    function propertyChanged(opt) {
        return function() {
            var path = $(this).parent().data('path'), val = parse($(this).next().val()), newKey = $(this).val(), oldKey = $(this).attr('title');

            $(this).attr('title', newKey);

            feed(opt.original, ( path ? path + '.' : '') + oldKey);
            if (newKey)
                feed(opt.original, ( path ? path + '.' : '') + newKey, val);

            updateParents(this, opt);

            if (!newKey)
                $(this).parent().remove();

            opt.container.data("data", opt.original);
            opt.raw.val(JSON.stringify(opt.original, null, "    "));

            opt.onchange(parse(stringify(opt.original)));
        };
    }

    function valueChanged(opt) {
        return function() {
            var key = $(this).prev().val(), val = parse($(this).val() || 'null'), item = $(this).parent(), path = item.data('path');

            feed(opt.original, ( path ? path + '.' : '') + key, val);
            if ((isObject(val) || isArray(val)) && !$.isEmptyObject(val)) {
                construct(opt, val, item, ( path ? path + '.' : '') + key);
                addExpander(item);
            } else {
                item.find('.expander, .item').remove();
            }

            assignType(item, val);

            updateParents(this, opt);

            opt.container.data("data", opt.original);
            opt.raw.val(JSON.stringify(opt.original, null, "    "));

            opt.onchange(parse(stringify(opt.original)));
        };
    }

    function assignType(item, val) {
        var className = 'null';

        if (isObject(val))
            className = 'object';
        else if (isArray(val))
            className = 'array';
        else if (isBoolean(val))
            className = 'boolean';
        else if (isString(val))
            className = 'string';
        else if (isNumber(val))
            className = 'number';

        item.removeClass(types);
        item.addClass(className);
    }

})(jQuery);
