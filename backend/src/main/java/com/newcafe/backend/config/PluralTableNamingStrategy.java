package com.newcafe.backend.config;

import org.hibernate.boot.model.naming.Identifier;
import org.hibernate.boot.model.naming.ImplicitEntityNameSource;
import org.hibernate.boot.model.naming.ImplicitNamingStrategyJpaCompliantImpl;

public class PluralTableNamingStrategy extends ImplicitNamingStrategyJpaCompliantImpl {

    @Override
    public Identifier determinePrimaryTableName(ImplicitEntityNameSource source) {
        String entityName = transformEntityName(source.getEntityNaming());
        String tableName = switch (entityName) {
            case "Song" -> "MusicRequests";
            case "MusicBoxState" -> "MusicBoxState";
            default -> pluralize(entityName);
        };
        return toIdentifier(tableName, source.getBuildingContext());
    }

    private String pluralize(String name) {
        if (name.endsWith("y") && name.length() > 1
                && "aeiouAEIOU".indexOf(name.charAt(name.length() - 2)) < 0) {
            return name.substring(0, name.length() - 1) + "ies";
        }
        return name + "s";
    }
}
