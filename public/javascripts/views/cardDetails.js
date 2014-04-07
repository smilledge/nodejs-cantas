(function ($, _, Backbone) {
  
  "use strict";

  /**
   * Modal window for card details
   */
  // cantas.views.CardDetailsView = cantas.views.BaseView.extend({});


  /**
   * Menu bar for the card details view
   */
  cantas.views.MenuView = cantas.views.BaseView.extend({

    tagName: 'nav',
    className: 'menu-bar',
    template: jade.compile('ul(class="menu-links clearfix")'),

    events: {
      'click .menu-links a': 'toggleMenu'
    },

    initialize: function() {
      this.menus = [];
    },

    render: function() {
      this.$el.html(this.template());
      this.renderMenus();
      return this;
    },

    /**
     * Render all the menus to the menu bar
     * 
     * @return {object} this
     */
    renderMenus: function() {
      if ( ! this.menus.length ) {
        return;
      }

      var $menuContainer = this.$('ul').first().empty();

      _.each(this.menus, function(menu) {
        if (_.isFunction(menu.renderLink)) {
          $menuContainer.append(menu.renderLink());
        }
      });
    },

    /**
     * Add a menu view to the menu bar
     *
     * @param {object}   view   MenuItemView
     * @return {object}
     */
    addMenu: function(view) {
      this.menus.push(view);
      this.renderMenus();
    },

    toggleMenu: function(e) {
      e.preventDefault();
      var target = $(e.target),
        href = target.attr('href'),
        id = href.substring(1, href.length);

      var menu = _.find(this.menus, function(menu) {
        return menu.id == id;
      });

      if (!menu) {
        return;
      }

      if (menu.isOpen) {
        this.closeMenu(menu);
      } else {
        this.openMenu(target, menu);
      }
    },

    /**
     * Open the target menu and then append it under it's target
     * 
     * @param  {target}    target    Menu item element to append under
     * @param  {MenuView}  menu      The menu view to open
     * @return {void}
     */
    openMenu: function(target, menu) {
      // Close any open menues
      _.each(this.menus, function(menu) {
        if (menu.isOpen) {
          menu.close();
        }
      });

      target.after(menu.open().$el);
    },

    /**
     * Close a menu
     * 
     * @param  {MenuView}  menu  The menu view to close
     * @return {void}
     */
    closeMenu: function(menu) {
      menu.close();
    },

    close: function() {
      _.each(this.menus, function(menu) {
        menu.remove();
      });
      this.remove();
    }

  });




  /**
   * Base view for a card details popup modal
   */
  cantas.views.BaseMenuItemView = cantas.views.BaseView.extend({

    isOpen: false,

    /**
     * Modal model
     * 
     * @type {Backbone.Model}
     */
    model: null,

    events: {
      'click .js-close': 'close'
    },

    render: function() {
      this.$el.html(this.template(this.model));
      return this;
    },

    /**
     * Render to modal link
     * 
     * @return {elem}
     */
    renderLink: function() {},

    open: function() {
      this.render();
      this.$el.show();
      this.isOpen = true;
      return this;
    },

    close: function() {
      this.$el.hide();
      this.isOpen = false; 
    }

  });




  /**
   * Card Due Date modal window
   */
  cantas.views.CardDueDateView = cantas.views.BaseMenuItemView.extend({

    id: _.uniqueId('due-date-view-'),

    template: jade.compile($("#template-card-due-date-view").text()),

    events: _.extend(cantas.views.BaseMenuItemView.prototype.events, {
      "click .js-save": "save"
    }),

    render: function() {
      var m = moment.utc(new Date(this.model.get('dueDate')));

      this.$el.html(this.template(_.extend({}, this.model, {
        dueDate: m.format('DD/MM/YYYY'),
        dueTime: m.format('hh:mm A')
      })));

      this.$('.js-datepicker').datepicker({
        altField: this.$('[name="due-date"]'),
        altFormat: "dd/mm/yy",
        defaultDate: m.format('MM/DD/YYYY')
      });

      this.$('.js-timepicker').timepicker({
        dropdown: false
      });

      return this;
    },

    renderLink: function() {
      return '<li><a href="#' + this.id + '">Due Date</a></li>';
    },

    save: function() {
      var date = this.$('.js-due-date').val(),
        time = this.$('.js-due-time').val(),
        m;

      if (_.isEmpty(date)) {
        this.close();
      }

      if (_.isEmpty(time)) {
        m = window.moment(date, "DD/MM/YYYY");
      } else {
        m = window.moment(date + ' ' + time, "DD/MM/YYYY hh:mm A");
      }

      if (m.isValid()) {
        this.model.patch({
          dueDate: m.toJSON()
        });
      }
      this.close();
    }

  });



  



  cantas.views.CardAssignView = cantas.views.BaseMenuItemView.extend({

    id: _.uniqueId('assign-view-'),

    template: jade.compile($("#template-card-assign-view").text()),

    events: _.extend(cantas.views.BaseMenuItemView.prototype.events, {
      "click .js-select-assignee": "selectAssignee",
      "click .js-save-assignee": "saveAssignee",
      "click .js-cancel-assign-window": "onAssignCancelClick"
    }),

    render: function() {
      this.$el.html(this.template({
        members: this._getMembersToAssign()
      }));
      return this;
    },

    renderLink: function() {
      var totalAsignees = this.model.get("assignees").length;
      return '<li><a href="#' + this.id + '">Assign <span class="badge">'+totalAsignees+'</span></a></li>';
    },

    _getMembersToAssign: function() {
      var assignees = _.pluck(this.model.get("assignees"), "_id");
      var memberCollection = cantas.utils.getCurrentBoardView().memberCollection;
      var members = memberCollection.toJSON().map(function(member) {
        if (assignees.indexOf(member.userId._id) === -1) {
          member.checked = false;
        } else {
          member.checked = true;
        }
        return member;
      });
      return members;
    },

    selectAssignee: function(e) {
      e.stopPropagation();
      var element = $(e.target);
      var uid = element.data('uid');
      if (!uid) {
        element = element.parent();
      }
      element.toggleClass("checked");
    },

    saveAssignee: function(e) {
      e.stopPropagation();
      var newAssignees = [];
      this.$("ul.assignee li.checked").each(function(index, element) {
        var uid = $(element).data('uid');
        newAssignees.push(uid);
      });
      var oldAssignees = _.pluck(this.model.get("assignees"), "_id");
      if (!_.isEqual(newAssignees.sort(), oldAssignees.sort())) {
        // update if assignees changed
        this.model.patch({
          assignees: newAssignees,
          original: {assignees: oldAssignees}
        });
      }
      this.renderLink();
      this.close();
    }

  });






}(jQuery, _, Backbone));